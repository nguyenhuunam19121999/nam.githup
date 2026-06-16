import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Audio } from "expo-av";
import Timer from "../../components/Timer";
import QuestionCard from "../../components/QuestionCard";
import { getExamById, Question } from "../../assets/data_EXAMS";

interface ListeningSectionProps {
  examFile: string;
  onComplete: (answers: number[], correct: number, total: number) => void;
  onTimeOut?: () => void;
  savedAnswers?: number[];
}

const AUDIO_MAP: Record<string, any> = {
  "n3_01": require("../../assets/data_EXAMS/audio/n3/n3_01.mp3"),
};

function AudioPlayer({ examFile }: { examFile: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    if (soundRef.current) return soundRef.current;

    const audioSource = AUDIO_MAP[examFile];
    if (!audioSource) {
      return null;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: false });
      soundRef.current = newSound;
      setSound(newSound);
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) setDuration(status.durationMillis || 0);
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

  const formatTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={audioStyles.container}>
      <TouchableOpacity style={[audioStyles.playBtn, isPlaying && audioStyles.playBtnActive]} onPress={playSound} disabled={isLoading}>
        <Text style={audioStyles.playIcon}>{isLoading ? "⏳" : isPlaying ? "⏸️" : "▶️"}</Text>
        <Text style={audioStyles.playText}>{isLoading ? "Đang tải..." : isPlaying ? "Tạm dừng" : "Phát"}</Text>
      </TouchableOpacity>
      {duration > 0 && (
        <View style={audioStyles.progressContainer}>
          <Text style={audioStyles.timeText}>{formatTime(position)}</Text>
          <View style={audioStyles.progressBar}>
            <View style={[audioStyles.progressFill, { width: `${(position / duration) * 100}%` }]} />
          </View>
          <Text style={audioStyles.timeText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );
}

const audioStyles = StyleSheet.create({
  container: { marginBottom: 16, padding: 12, backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  playBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30, backgroundColor: "#3B82F6", minWidth: 120 },
  playBtnActive: { backgroundColor: "#EF4444" },
  playIcon: { fontSize: 20, color: "#fff" },
  playText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  progressBar: { flex: 1, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#3B82F6", borderRadius: 2 },
  timeText: { fontSize: 11, color: "#94a3b8", minWidth: 40, textAlign: "center" },
});

export default function ListeningSection({ examFile, onComplete, onTimeOut, savedAnswers = [] }: ListeningSectionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const exam = getExamById(examFile);
        if (exam?.listening) {
          const qs: Question[] = [];
          for (const section of exam.listening.sections) {
            qs.push(...section.questions);
          }
          setQuestions(qs);
          setAnswers(savedAnswers.length > 0 ? savedAnswers : new Array(qs.length).fill(-1));
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examFile]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelectAnswer = (idx: number) => {
    setSelectedAnswer(idx);
  };

  const handleNext = () => {
    if (selectedAnswer === null) {
      return;
    }
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      let correctCount = 0;
      for (let i = 0; i < questions.length; i++) {
        if (newAnswers[i] === questions[i]?.correct) correctCount++;
      }
      onComplete(newAnswers, correctCount, questions.length);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Đang tải câu hỏi nghe...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Chưa có câu hỏi nghe cho đề thi này</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Timer minutes={35} onTimeOut={onTimeOut} />

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>Câu {currentIndex + 1}/{questions.length}</Text>
      </View>

      <AudioPlayer examFile={examFile} />

      {currentQuestion && (
        <QuestionCard
          question={{
            id: currentQuestion.id,
            text: currentQuestion.text,
            options: currentQuestion.options,
            image: currentQuestion.image || undefined,
          }}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={handleSelectAnswer}
          hasImage={!!currentQuestion.image}
        />
      )}

      <TouchableOpacity style={[styles.nextBtn, selectedAnswer === null && styles.nextBtnDisabled]} onPress={handleNext} disabled={selectedAnswer === null}>
        <Text style={styles.nextBtnText}>{currentIndex + 1 === questions.length ? "Hoàn thành phần nghe" : "Câu tiếp theo"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  loadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },
  errorText: { fontSize: 16, color: "#ef4444", textAlign: "center" },
  progressSection: { marginBottom: 16 },
  progressBar: { height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, backgroundColor: "#10B981", borderRadius: 2 },
  progressText: { fontSize: 12, color: "#64748b", textAlign: "right", marginBottom: 16 },
  nextBtn: { backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 20 },
  nextBtnDisabled: { backgroundColor: "#cbd5e1" },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
