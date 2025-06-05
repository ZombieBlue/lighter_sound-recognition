import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
import os

# --- Configuration ---
PROCESSED_DATA_DIR = 'processed_data'
MODEL_SAVE_PATH = 'lighter_detector_model.h5' # Or SavedModel format
EPOCHS = 20
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2 # Use 20% of data for validation

# --- Load Data ---
print("Loading processed data...")
X = np.load(os.path.join(PROCESSED_DATA_DIR, 'features.npy'))
y = np.load(os.path.join(PROCESSED_DATA_DIR, 'labels.npy'))

print(f"Features shape: {X.shape}")
print(f"Labels shape: {y.shape}")

# --- Split Data ---
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=VALIDATION_SPLIT, random_state=42, stratify=y # Stratify helps keep class balance
)

print(f"Training samples: {len(X_train)}")
print(f"Validation samples: {len(X_val)}")

# --- Define Model ---
input_shape = X_train.shape[1:] # (n_mels, time_steps, 1)

model = keras.Sequential(
    [
        keras.Input(shape=input_shape),
        layers.Conv2D(32, kernel_size=(3, 3), activation="relu"),
        layers.MaxPooling2D(pool_size=(2, 2)),
        layers.Conv2D(64, kernel_size=(3, 3), activation="relu"),
        layers.MaxPooling2D(pool_size=(2, 2)),
        layers.Flatten(),
        layers.Dropout(0.5), # Regularization
        layers.Dense(1, activation="sigmoid"), # Binary classification output
    ]
)

model.summary()

# --- Compile Model ---
model.compile(loss="binary_crossentropy", optimizer="adam", metrics=["accuracy"])

# --- Train Model ---
print("Starting training...")
history = model.fit(
    X_train,
    y_train,
    batch_size=BATCH_SIZE,
    epochs=EPOCHS,
    validation_data=(X_val, y_val),
)

# --- Evaluate (Optional) ---
loss, accuracy = model.evaluate(X_val, y_val, verbose=0)
print(f"Validation Loss: {loss:.4f}")
print(f"Validation Accuracy: {accuracy:.4f}")

# --- Save Model ---
model.save(MODEL_SAVE_PATH)
print(f"Model saved to {MODEL_SAVE_PATH}")

