import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
} from "react-native";

interface TimerProps {
  minutes: number;
  onTimeOut?: () => void;
  isActive?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export default function Timer({ 
  minutes, 
  onTimeOut, 
  isActive = true, 
  onTimeUpdate 
}: TimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(minutes * 60);
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  // Cách 1: Dùng ReturnType
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTotalSeconds(minutes * 60);
    setShowWarning(false);
    setWarningDismissed(false);
  }, [minutes]);

  useEffect(() => {
    if (isActive && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          const newTime = prev - 1;
          if (onTimeUpdate) onTimeUpdate(newTime);
          
          if (newTime === 300 && !warningDismissed) {
            setShowWarning(true);
            Vibration.vibrate(500);
          }
          
          if (newTime === 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (onTimeOut) onTimeOut();
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, totalSeconds, warningDismissed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (totalSeconds <= 60) return "#EF4444";
    if (totalSeconds <= 300) return "#F59E0B";
    return "#10B981";
  };

  const handleDismissWarning = () => {
    setShowWarning(false);
    setWarningDismissed(true);
  };

  return (
    <>
      <View style={[styles.timerContainer, { backgroundColor: getTimerColor() + "15" }]}>
        <Text style={styles.timerLabel}>⏱️ Thời gian còn lại</Text>
        <Text style={[styles.timerText, { color: getTimerColor() }]}>
          {formatTime(totalSeconds)}
        </Text>
      </View>

      <Modal
        visible={showWarning}
        transparent
        animationType="fade"
        onRequestClose={handleDismissWarning}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningModal}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Sắp hết thời gian!</Text>
            <Text style={styles.warningText}>
              Còn 5 phút cuối. Bạn có muốn tiếp tục làm bài?
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity 
                style={[styles.warningBtn, styles.warningBtnSecondary]}
                onPress={handleDismissWarning}
              >
                <Text style={styles.warningBtnText}>Tiếp tục</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  warningModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F59E0B",
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  warningButtons: {
    flexDirection: "row",
    gap: 12,
  },
  warningBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  warningBtnSecondary: {
    backgroundColor: "#7C3AED",
  },
  warningBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
