import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ImageViewer from "./ImageViewer";

interface Question {
  id: number;
  text: string;
  options: string[];
  image?: string;
  audio?: string;
  correct?: number;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelectAnswer: (index: number) => void;
  hasImage?: boolean;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  hasImage = false,
}: QuestionCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.questionNumber}>
          問題 {questionNumber}/{totalQuestions}
        </Text>
      </View>

      {/* Hiển thị hình ảnh nếu có */}
      {hasImage && question.image && (
        <ImageViewer imageFile={question.image} />
      )}

      <Text style={styles.questionText}>{question.text}</Text>

      <View style={styles.optionsContainer}>
        {question.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.option,
              selectedAnswer === idx && styles.optionSelected,
            ]}
            onPress={() => onSelectAnswer(idx)}
          >
            <View style={styles.optionLeft}>
              <Text style={[
                styles.optionNumber,
                selectedAnswer === idx && styles.optionNumberSelected,
              ]}>
                {idx + 1}
              </Text>
              <Text style={[
                styles.optionText,
                selectedAnswer === idx && styles.optionTextSelected,
              ]}>
                {option}
              </Text>
            </View>
            <View style={[
              styles.radio,
              selectedAnswer === idx && styles.radioSelected,
            ]}>
              {selectedAnswer === idx && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C3AED",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    lineHeight: 24,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionSelected: {
    backgroundColor: "#7C3AED10",
    borderColor: "#7C3AED",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    width: 28,
  },
  optionNumberSelected: {
    color: "#7C3AED",
  },
  optionText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  optionTextSelected: {
    color: "#7C3AED",
    fontWeight: "500",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#7C3AED",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7C3AED",
  },
});
