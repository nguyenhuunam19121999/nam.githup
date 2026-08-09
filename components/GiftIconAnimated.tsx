//////////////hiệu ứng lúc lắc icon
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function GiftIconAnimated({ children }: { children: React.ReactNode }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const wiggle = () => {
      rotate.setValue(0);
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
      ]).start(() => {
        if (isMounted) timeoutId = setTimeout(wiggle, 3500);
      });
    };

    timeoutId = setTimeout(wiggle, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
      {children}
    </Animated.View>
  );
}