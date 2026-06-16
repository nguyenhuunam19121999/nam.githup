import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Audio } from "expo-av";

interface AudioPlayerProps {
  examFile: string;
}

// ============================================
// MAPPING AUDIO - THÊM THỦ CÔNG TỪNG DÒNG
// ============================================
// Format: "tên_file": require("đường_dẫn"),
// Tên file lấy từ examFile (bỏ _text, _audio, _image)
// Ví dụ: examFile = "n4_2021_07_text" -> lấy "n4_2021_07"

const AUDIO_MAP: Record<string, any> = {
  // ========== N5 ==========
  "n5_2010_07": require("../assets/audio/n5/n5_2010_07.mp3"),
  "n5_2010_12": require("../assets/audio/n5/n5_2010_12.mp3"),
  "n5_2011_07": require("../assets/audio/n5/n5_2011_07.mp3"),
  "n5_2011_12": require("../assets/audio/n5/n5_2011_12.mp3"),
  "n5_2012_07": require("../assets/audio/n5/n5_2012_07.mp3"),
  "n5_2012_12": require("../assets/audio/n5/n5_2012_12.mp3"),
  "n5_2013_07": require("../assets/audio/n5/n5_2013_07.mp3"),
  "n5_2013_12": require("../assets/audio/n5/n5_2013_12.mp3"),
  "n5_2014_07": require("../assets/audio/n5/n5_2014_07.mp3"),
  "n5_2014_12": require("../assets/audio/n5/n5_2014_12.mp3"),
  "n5_2015_07": require("../assets/audio/n5/n5_2015_07.mp3"),
  "n5_2015_12": require("../assets/audio/n5/n5_2015_12.mp3"),
  "n5_2016_07": require("../assets/audio/n5/n5_2016_07.mp3"),
  "n5_2016_12": require("../assets/audio/n5/n5_2016_12.mp3"),
  "n5_2017_07": require("../assets/audio/n5/n5_2017_07.mp3"),
  "n5_2017_12": require("../assets/audio/n5/n5_2017_12.mp3"),
  "n5_2018_07": require("../assets/audio/n5/n5_2018_07.mp3"),
  "n5_2018_12": require("../assets/audio/n5/n5_2018_12.mp3"),
  "n5_2019_07": require("../assets/audio/n5/n5_2019_07.mp3"),
  "n5_2019_12": require("../assets/audio/n5/n5_2019_12.mp3"),
  "n5_2020_07": require("../assets/audio/n5/n5_2020_07.mp3"),
  "n5_2020_12": require("../assets/audio/n5/n5_2020_12.mp3"),
  "n5_2021_07": require("../assets/audio/n5/n5_2021_07.mp3"),
  "n5_2021_12": require("../assets/audio/n5/n5_2021_12.mp3"),
  "n5_2022_07": require("../assets/audio/n5/n5_2022_07.mp3"),
  "n5_2022_12": require("../assets/audio/n5/n5_2022_12.mp3"),
  "n5_2023_07": require("../assets/audio/n5/n5_2023_07.mp3"),
  "n5_2023_12": require("../assets/audio/n5/n5_2023_12.mp3"),
  "n5_2024_07": require("../assets/audio/n5/n5_2024_07.mp3"),
  "n5_2024_12": require("../assets/audio/n5/n5_2024_12.mp3"),
  "n5_2025_07": require("../assets/audio/n5/n5_2025_07.mp3"),
  "n5_2025_12": require("../assets/audio/n5/n5_2025_12.mp3"),

  // ========== N4 ==========
  "n4_2010_07": require("../assets/audio/n4/n4_2010_07.mp3"),
  "n4_2010_12": require("../assets/audio/n4/n4_2010_12.mp3"),
  "n4_2011_07": require("../assets/audio/n4/n4_2011_07.mp3"),
  "n4_2011_12": require("../assets/audio/n4/n4_2011_12.mp3"),
  "n4_2012_07": require("../assets/audio/n4/n4_2012_07.mp3"),
  "n4_2012_12": require("../assets/audio/n4/n4_2012_12.mp3"),
  "n4_2013_07": require("../assets/audio/n4/n4_2013_07.mp3"),
  "n4_2013_12": require("../assets/audio/n4/n4_2013_12.mp3"),
  "n4_2014_07": require("../assets/audio/n4/n4_2014_07.mp3"),
  "n4_2014_12": require("../assets/audio/n4/n4_2014_12.mp3"),
  "n4_2015_07": require("../assets/audio/n4/n4_2015_07.mp3"),
  "n4_2015_12": require("../assets/audio/n4/n4_2015_12.mp3"),
  "n4_2016_07": require("../assets/audio/n4/n4_2016_07.mp3"),
  "n4_2016_12": require("../assets/audio/n4/n4_2016_12.mp3"),
  "n4_2017_07": require("../assets/audio/n4/n4_2017_07.mp3"),
  "n4_2017_12": require("../assets/audio/n4/n4_2017_12.mp3"),
  "n4_2018_07": require("../assets/audio/n4/n4_2018_07.mp3"),
  "n4_2018_12": require("../assets/audio/n4/n4_2018_12.mp3"),
  "n4_2019_07": require("../assets/audio/n4/n4_2019_07.mp3"),
  "n4_2019_12": require("../assets/audio/n4/n4_2019_12.mp3"),
  "n4_2020_07": require("../assets/audio/n4/n4_2020_07.mp3"),
  "n4_2020_12": require("../assets/audio/n4/n4_2020_12.mp3"),
  "n4_2021_07": require("../assets/audio/n4/n4_2021_07.mp3"),
  "n4_2021_12": require("../assets/audio/n4/n4_2021_12.mp3"),
  "n4_2022_07": require("../assets/audio/n4/n4_2022_07.mp3"),
  "n4_2022_12": require("../assets/audio/n4/n4_2022_12.mp3"),
  "n4_2023_07": require("../assets/audio/n4/n4_2023_07.mp3"),
  "n4_2023_12": require("../assets/audio/n4/n4_2023_12.mp3"),
  "n4_2024_07": require("../assets/audio/n4/n4_2024_07.mp3"),
  "n4_2024_12": require("../assets/audio/n4/n4_2024_12.mp3"),
  "n4_2025_07": require("../assets/audio/n4/n4_2025_07.mp3"),
  "n4_2025_12": require("../assets/audio/n4/n4_2025_12.mp3"),

  // ========== N3 ==========
  "n3_2010_07": require("../assets/audio/n3/n3_2010_07.mp3"),
  "n3_2010_12": require("../assets/audio/n3/n3_2010_12.mp3"),
  // Thêm tiếp các năm khác...

  // ========== N2 ==========
  "n2_2010_07": require("../assets/audio/n2/n2_2010_07.mp3"),
  "n2_2010_12": require("../assets/audio/n2/n2_2010_12.mp3"),
  // Thêm tiếp các năm khác...

  // ========== N1 ==========
  "n1_2010_07": require("../assets/audio/n1/n1_2010_07.mp3"),
  "n1_2010_12": require("../assets/audio/n1/n1_2010_12.mp3"),
  // Thêm tiếp các năm khác...
};

export default function AudioPlayer({ examFile }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Lấy key audio từ examFile (bỏ _text, _audio, _image)
  const getAudioKey = () => {
    return examFile.replace("_text", "").replace("_audio", "").replace("_image", "");
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    if (soundRef.current) return soundRef.current;

    const audioKey = getAudioKey();
    const audioSource = AUDIO_MAP[audioKey];
    
    if (!audioSource) {
      return null;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: false });
      soundRef.current = newSound;
      setSound(newSound);

      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
      }
      return newSound;
    } catch (error) {
      return null;
    }
  };

  const playSound = async () => {
    const currentSound = await loadSound();
    if (!currentSound) return;

    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await currentSound.pauseAsync();
          setIsPlaying(false);
        } else {
          await currentSound.playAsync();
          setIsPlaying(true);

          currentSound.setOnPlaybackStatusUpdate((newStatus: any) => {
            if (newStatus.isLoaded) {
              setPosition(newStatus.positionMillis || 0);
              if (newStatus.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          });
        }
      }
    } catch (error) {
    }
  };

  const seekBackward = async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;

    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, (status.positionMillis || 0) - 10000);
        await currentSound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {
    }
  };

  const seekForward = async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;

    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.min((status.durationMillis || 0), (status.positionMillis || 0) + 10000);
        await currentSound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {}
  };

  const formatTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlBtn} onPress={seekBackward} disabled={isLoading}>
          <Text style={styles.controlIcon}>⏪</Text>
          <Text style={styles.controlText}>10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.playBtn, isPlaying && styles.playBtnActive]} onPress={playSound} disabled={isLoading}>
          <Text style={styles.playIcon}>{isLoading ? "⏳" : isPlaying ? "⏸️" : "▶️"}</Text>
          <Text style={styles.playText}>{isLoading ? "Đang tải..." : isPlaying ? "Tạm dừng" : "Phát"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={seekForward} disabled={isLoading}>
          <Text style={styles.controlIcon}>⏩</Text>
          <Text style={styles.controlText}>10s</Text>
        </TouchableOpacity>
      </View>

      {duration > 0 && (
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(position / duration) * 100}%` }]} />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    minWidth: 120,
  },
  playBtnActive: {
    backgroundColor: "#EF4444",
  },
  controlIcon: {
    fontSize: 18,
    color: "#475569",
  },
  controlText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  playIcon: {
    fontSize: 20,
    color: "#fff",
  },
  playText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
    minWidth: 40,
    textAlign: "center",
  },
});
