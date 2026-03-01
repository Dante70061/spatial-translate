import numpy as np

def get_angle_relative(audio_bytes):
    # Convert bytes to 16-bit PCM array
    audio_data = np.frombuffer(audio_bytes, dtype=np.int16)

    # Need at least one stereo sample (L, R)
    if len(audio_data) < 2:
        return 0

    # Separate channels: [L, R, L, R...]
    left_channel = audio_data[0::2]
    right_channel = audio_data[1::2]

    # Calculate RMS Power (Loudness)
    l_power = np.sqrt(np.mean(left_channel.astype(float)**2))
    r_power = np.sqrt(np.mean(right_channel.astype(float)**2))

    # DEBUG: Print powers to see if they are identical (Mono)
    # print(f"L: {round(l_power, 2)} | R: {round(r_power, 2)}")

    # Handle Silence or Identical signals (Mono)
    if (l_power + r_power) == 0:
        return 0
    
    # If the signals are perfectly identical, it's a Mono stream
    # Force it to Center (0 degrees)
    if abs(l_power - r_power) < 0.01:
        return 0

    # Calculate Pan (-1.0 Left to 1.0 Right)
    pan = (r_power - l_power) / (r_power + l_power)

    # Convert to Angle (-90 to 90)
    angle = pan * 90

    # DEADZONE: If it's very close to center, snap to 0
    if abs(angle) < 5:
        return 0

    return round(angle, 1)
