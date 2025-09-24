import React from "react";
import { LinearGradient } from "expo-linear-gradient";

// Shim to alias react-native-linear-gradient to expo-linear-gradient
// Both share similar props for common use-cases used by libraries like gifted-charts.
// This component simply re-exports expo-linear-gradient as default.

export default LinearGradient;
