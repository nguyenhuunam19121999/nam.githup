// import React, { useState, useEffect } from "react";
// import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// import Timer from "../../components/Timer";
// import QuestionCard from "../../components/QuestionCard";
// import { getExamById } from "../../assets/data_EXAMS";

// interface VocabSectionProps {
//   examFile: string;
//   onComplete: (answers: number[], correct: number, total: number) => void;
//   onTimeOut?: () => void;
//   savedAnswers?: number[];
// }

// export default function VocabSection({ examFile, onComplete, onTimeOut, savedAnswers = [] }: VocabSectionProps) {
//   const [questions, setQuestions] = useState<any[]>([]);
//   const [answers, setAnswers] = useState<number[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const exam = getExamById(examFile);
        
//         if (exam?.vocab?.sections) {
//           const qs: any[] = [];
//           for (const section of exam.vocab.sections) {
//             if (section.questions && section.questions.length > 0) {
//               qs.push(...section.questions);
//             }
//           }
//           setQuestions(qs);
//           setAnswers(savedAnswers.length > 0 ? savedAnswers : new Array(qs.length).fill(-1));
//         } else {
//         }
//       } catch (error) {
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [examFile]);

//   const currentQuestion = questions[currentIndex];
//   const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

//   const handleSelectAnswer = (idx: number) => {
//     setSelectedAnswer(idx);
//   };

//   const handleNext = () => {
//     if (selectedAnswer === null) return;
    
//     const newAnswers = [...answers];
//     newAnswers[currentIndex] = selectedAnswer;
//     setAnswers(newAnswers);
//     setSelectedAnswer(null);

//     if (currentIndex + 1 < questions.length) {
//       setCurrentIndex(currentIndex + 1);
//     } else {
//       let correctCount = 0;
//       for (let i = 0; i < questions.length; i++) {
//         if (newAnswers[i] === questions[i]?.correct) correctCount++;
//       }
//       onComplete(newAnswers, correctCount, questions.length);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#3B82F6" />
//         <Text style={styles.loadingText}>Đang tải câu hỏi từ vựng...</Text>
//       </View>
//     );
//   }

//   if (questions.length === 0) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text style={styles.errorText}>Chưa có câu hỏi từ vựng cho đề thi này</Text>
//         <Text style={styles.debugText}>examFile: {examFile}</Text>
//       </View>
//     );
//   }

//   if (!currentQuestion) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text style={styles.errorText}>Không thể tải câu hỏi</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//       <Timer minutes={30} onTimeOut={onTimeOut} />

//       <View style={styles.progressSection}>
//         <View style={styles.progressBar}>
//           <View style={[styles.progressFill, { width: `${progress}%` }]} />
//         </View>
//         <Text style={styles.progressText}>Câu {currentIndex + 1}/{questions.length}</Text>
//       </View>

//       <QuestionCard
//         question={{
//           id: currentQuestion.id,
//           text: currentQuestion.text,
//           options: currentQuestion.options,
//         }}
//         questionNumber={currentIndex + 1}
//         totalQuestions={questions.length}
//         selectedAnswer={selectedAnswer}
//         onSelectAnswer={handleSelectAnswer}
//       />

//       <TouchableOpacity style={[styles.nextBtn, selectedAnswer === null && styles.nextBtnDisabled]} onPress={handleNext} disabled={selectedAnswer === null}>
//         <Text style={styles.nextBtnText}>{currentIndex + 1 === questions.length ? "Hoàn thành phần từ vựng" : "Câu tiếp theo"}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
//   loadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },
//   errorText: { fontSize: 16, color: "#ef4444", textAlign: "center", marginBottom: 8 },
//   debugText: { fontSize: 12, color: "#94a3b8", textAlign: "center" },
//   progressSection: { marginBottom: 16 },
//   progressBar: { height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, marginBottom: 6 },
//   progressFill: { height: 4, backgroundColor: "#3B82F6", borderRadius: 2 },
//   progressText: { fontSize: 12, color: "#64748b", textAlign: "right", marginBottom: 16 },
//   nextBtn: { backgroundColor: "#3B82F6", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 20 },
//   nextBtnDisabled: { backgroundColor: "#cbd5e1" },
//   nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
// });
