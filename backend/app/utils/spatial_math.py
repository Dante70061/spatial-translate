import numpy as np

def get_angle_relative(audio_bytes):
    audio_data = np.frombuffer(audio_bytes, dtype=np.int16)

    if len(audio_data) < 2:
        return 0

    left_channel = audio_data[0::2]
    right_channel = audio_data[1::2]

    l_power = np.sqrt(np.mean(left_channel.astype(float)**2))
    r_power = np.sqrt(np.mean(right_channel.astype(float)**2))

    if (l_power + r_power) == 0:
        return 0

    pan = (r_power - l_power) / (r_power + l_power)

    angle = pan * 90

    return round(angle, 1)