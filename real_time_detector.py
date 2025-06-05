import sounddevice as sd
import numpy as np
import librosa
import tensorflow as tf
import requests  # To send data to web backend
import time
import json
from collections import deque
import sys  # Import sys to exit gracefully
import argparse  # Import argparse for command line arguments

# --- Configuration ---
MODEL_PATH = 'lighter_detector_model.h5'
SAMPLE_RATE = 16000
DURATION = 1.0  # Must match the duration used for training/preprocessing
HOP_LENGTH = 512
N_MELS = 128
N_FFT = 2048
CHUNK_SAMPLES = int(DURATION * SAMPLE_RATE)  # Process audio in chunks matching training duration
CONFIDENCE_THRESHOLD = 0.50  # Trigger if prediction probability > threshold
WEB_BACKEND_URL = 'http://127.0.0.1:5000/api/events'  # URL of your Flask backend API

# --- Command Line Arguments ---
parser = argparse.ArgumentParser(description='Real-time lighter sound detection with location tracking')
parser.add_argument('--location', type=str, default='unknown', help='Monitoring location (e.g., warehouse, bathroom, fitting_room)')
parser.add_argument('--risk-level', type=str, default='medium', choices=['low', 'medium', 'high'], 
                    help='Risk level of the monitoring location (low, medium, high)')
args = parser.parse_args()

LOCATION = args.location
RISK_LEVEL = args.risk_level

# --- Debouncing/Smoothing ---
PREDICTION_BUFFER_SIZE = 2  # 可以保持不变，或者减少 (例如 2)
prediction_buffer = deque(maxlen=PREDICTION_BUFFER_SIZE)
# POSITIVE_COUNT_THRESHOLD = 2 # 原始值: 需要最近3个里有2个超过阈值
POSITIVE_COUNT_THRESHOLD = 2  # <<< 修改为1: 只要有1个超过阈值就触发


# --- Microphone Permission Check Function ---
def check_microphone_permission():
    """
    Attempts to open a brief audio input stream to check microphone access.
    Returns True if successful, False otherwise.
    """
    print("Checking microphone permission...")
    try:
        # Try opening a stream with minimal settings
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, blocksize=1, callback=lambda i, o, f, s: None):
            # If the 'with' statement executes without error, we likely have permission.
            # We don't need to actually record anything.
            sd.sleep(50)  # Give it a tiny moment just in case
        print("Microphone access seems available.")
        return True
    except sd.PortAudioError as e:
        print("-----------------------------------------------------------", file=sys.stderr)
        print(f"ERROR: PortAudioError encountered - Could not open audio stream.", file=sys.stderr)
        print(f"       Details: {e}", file=sys.stderr)
        print(f"       This often means microphone access is denied by the OS.", file=sys.stderr)
        print(f"       Please check Windows Microphone Privacy Settings:", file=sys.stderr)
        print(f"       Settings > Privacy & security > Microphone", file=sys.stderr)
        print(f"       Ensure 'Microphone access' is ON and 'Let desktop apps access your microphone' is ON.",
              file=sys.stderr)
        print("-----------------------------------------------------------", file=sys.stderr)
        return False
    except ValueError as e:
        # This might happen if no input device is found at all
        print("-----------------------------------------------------------", file=sys.stderr)
        print(f"ERROR: ValueError encountered - Could not find suitable input device.", file=sys.stderr)
        print(f"       Details: {e}", file=sys.stderr)
        print(f"       Please ensure a microphone is connected and recognized by Windows.", file=sys.stderr)
        print("-----------------------------------------------------------", file=sys.stderr)
        return False
    except Exception as e:
        # Catch other potential unexpected errors during the check
        print("-----------------------------------------------------------", file=sys.stderr)
        print(f"ERROR: An unexpected error occurred during microphone check.", file=sys.stderr)
        print(f"       Details: {e}", file=sys.stderr)
        print("-----------------------------------------------------------", file=sys.stderr)
        return False


# --- Load Model ---
print("Loading model...")
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print(f"ERROR: Failed to load model from {MODEL_PATH}", file=sys.stderr)
    print(f"       Details: {e}", file=sys.stderr)
    sys.exit(1)  # Exit if model cannot be loaded


# --- Feature Extraction Function ---
def extract_realtime_features(y, sample_rate, n_mels, n_fft, hop_length):
    # (Function remains the same as before)
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sample_rate, n_fft=n_fft, hop_length=hop_length, n_mels=n_mels
    )
    log_mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
    return log_mel_spec[np.newaxis, ..., np.newaxis]


# --- Audio Callback Function ---
def audio_callback(indata, frames, time_info, status):
    # (Function remains the same as before)
    if status:
        print(status, file=sys.stderr)  # Print errors to stderr

    if indata.shape[1] > 1:
        y = np.mean(indata, axis=1)
    else:
        y = indata.flatten()

    if len(y) == CHUNK_SAMPLES:
        try:
            features = extract_realtime_features(y, SAMPLE_RATE, N_MELS, N_FFT, HOP_LENGTH)
            prediction = model.predict(features, verbose=0)[0][0]

            is_positive = prediction > CONFIDENCE_THRESHOLD
            prediction_buffer.append(is_positive)  # 缓冲区仍然记录历史

            # 修改后的判断: 只要缓冲区内至少有一个True就触发
            # 注意：如果 POSITIVE_COUNT_THRESHOLD = 1，缓冲区大小几乎不重要了，
            # 因为只要is_positive是True，sum就会>=1

            if is_positive:  # <<< 新逻辑 (当POSITIVE_COUNT_THRESHOLD = 1时等效)
                # 或者更明确一点写成 if sum(prediction_buffer) >= POSITIVE_COUNT_THRESHOLD: 并且 POSITIVE_COUNT_THRESHOLD=1
                print(f"DETECTED Lighter Sound! Confidence: {prediction:.2f}")
                try:
                    event_data = {
                        'timestamp': time.time(),
                        'confidence': float(prediction),
                        'device_id': 'windows_pc_1',
                        'location': LOCATION,
                        'risk_level': RISK_LEVEL
                    }
                    response = requests.post(WEB_BACKEND_URL, json=event_data, timeout=5)
                    response.raise_for_status()
                    print(f" -> Event sent to backend. Status: {response.status_code}")
                except requests.exceptions.RequestException as e:
                    print(f" !! Failed to send event to backend: {e}", file=sys.stderr)
                prediction_buffer.clear()  # 触发后清除，避免连续触发同一个事件段
            # else: # Optional silent state
            # pass

        except Exception as e:
            print(f"Error during processing/prediction: {e}", file=sys.stderr)


# --- Main Execution Block ---
if __name__ == "__main__":
    print(f"Starting detector for location: {LOCATION} (Risk level: {RISK_LEVEL})")
    
    # 1. Check microphone permission first
    if not check_microphone_permission():
        print("Exiting due to microphone access issue.", file=sys.stderr)
        input("Press Enter to exit...")  # Keep window open until user acknowledges
        sys.exit(1)  # Exit the script if permission check fails

    # 2. If permission check passed, start the main audio stream
    print("\nStarting main audio stream...")
    try:
        with sd.InputStream(
                samplerate=SAMPLE_RATE,
                blocksize=CHUNK_SAMPLES,
                channels=1,
                dtype='float32',
                callback=audio_callback):
            print(f"Listening for lighter sounds at {LOCATION}... Press Ctrl+C to stop.")
            while True:
                time.sleep(1)  # Use time.sleep instead of sd.sleep for main loop
    except KeyboardInterrupt:
        print("\nStopping detection.")
    except sd.PortAudioError as e:
        print("\n-----------------------------------------------------------", file=sys.stderr)
        print(f"ERROR: PortAudioError during main audio stream.", file=sys.stderr)
        print(f"       Details: {e}", file=sys.stderr)
        print(f"       This could indicate the microphone was disconnected or access was revoked.", file=sys.stderr)
        print("-----------------------------------------------------------", file=sys.stderr)
        input("Press Enter to exit...")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn unexpected error occurred during the main loop: {e}", file=sys.stderr)
        input("Press Enter to exit...")
        sys.exit(1)
