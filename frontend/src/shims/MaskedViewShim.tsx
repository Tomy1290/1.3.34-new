import React from "react";
import { View, StyleSheet } from "react-native";

// Very simple shim for @react-native-masked-view/masked-view
// It ignores the mask and just renders children.
// This prevents build-time resolution errors when the native module isn't installed.
// NOTE: Visual masking effects will not be present with this shim.

type Props = {
  children?: React.ReactNode;
  style?: any;
};

export default function MaskedViewShim({ children, style }: Props) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 0 },
});
