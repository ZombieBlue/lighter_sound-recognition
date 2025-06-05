import librosa
import numpy as np
import os
import soundfile as sf
from tqdm import tqdm  # Optional progress bar

# --- Configuration ---
DATA_DIR = 'data'
OUTPUT_DIR = 'processed_data'
SAMPLE_RATE = 16000  # Target sample rate (Hz)
DURATION = 1.0  # Duration of each segment in seconds
HOP_LENGTH = 512  # For Mel Spectrogram
N_MELS = 128  # Number of Mel bands
N_FFT = 2048  # FFT window size

# --- Ensure output directory exists ---
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_features(file_path, duration, sample_rate, n_mels, n_fft, hop_length):
    """Loads audio, pads/truncates, extracts Mel Spectrogram."""
    try:
        # Load audio file
        y, sr = librosa.load(file_path, sr=sample_rate)

        # Pad or truncate to ensure fixed length
        target_length = int(duration * sample_rate)
        if len(y) < target_length:
            y = np.pad(y, (0, target_length - len(y)), mode='constant')
        else:
            y = y[:target_length]

        # Extract Mel Spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
            n_mels=n_mels
        )
        # Convert to decibels (log scale)
        log_mel_spec = librosa.power_to_db(mel_spec, ref=np.max)

        return log_mel_spec

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None


def process_folder(folder_path, label, duration, sample_rate, n_mels, n_fft, hop_length):
    """Processes all WAV files in a folder."""
    features = []
    labels = []
    print(f"Processing folder: {folder_path} with label {label}")
    for filename in tqdm(os.listdir(folder_path)):
        if filename.lower().endswith('.wav'):
            file_path = os.path.join(folder_path, filename)
            feature = extract_features(file_path, duration, sample_rate, n_mels, n_fft, hop_length)
            if feature is not None:
                features.append(feature)
                labels.append(label)
    return features, labels


# --- Main Processing Logic ---
lighter_features, lighter_labels = process_folder(
    os.path.join(DATA_DIR, 'lighter'), 1,  # Label 1 for lighter
    DURATION, SAMPLE_RATE, N_MELS, N_FFT, HOP_LENGTH
)

background_features, background_labels = process_folder(
    os.path.join(DATA_DIR, 'background'), 0,  # Label 0 for background
    DURATION, SAMPLE_RATE, N_MELS, N_FFT, HOP_LENGTH
)

# --- Combine and Save ---
all_features = np.array(lighter_features + background_features)
all_labels = np.array(lighter_labels + background_labels)

# Add channel dimension for CNN input (height, width, channels=1)
all_features = all_features[..., np.newaxis]

print(f"Total features shape: {all_features.shape}")  # Should be (num_samples, n_mels, time_steps, 1)
print(f"Total labels shape: {all_labels.shape}")

# Save processed data
np.save(os.path.join(OUTPUT_DIR, 'features.npy'), all_features)
np.save(os.path.join(OUTPUT_DIR, 'labels.npy'), all_labels)

print(f"Processed data saved to {OUTPUT_DIR}")
