import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.iron[950],
  },
  screenPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // room for bottom tab
  },
  card: {
    backgroundColor: colors.iron[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.iron[800],
    padding: 20,
    marginBottom: 12,
  },
  cardCompact: {
    backgroundColor: colors.iron[900],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.iron[800],
    padding: 16,
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: colors.accent.DEFAULT,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center" as const,
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontWeight: "700" as const,
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: colors.iron[800],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.iron[700],
    alignItems: "center" as const,
  },
  btnSecondaryText: {
    color: colors.iron[100],
    fontWeight: "600" as const,
    fontSize: 16,
  },
  input: {
    backgroundColor: colors.iron[800],
    borderWidth: 1,
    borderColor: colors.iron[700],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.iron[100],
    fontSize: 18,
  },
  label: {
    color: colors.iron[300],
    fontSize: 13,
    fontWeight: "500" as const,
    marginBottom: 6,
  },
  h1: {
    color: colors.iron[100],
    fontSize: 26,
    fontWeight: "800" as const,
    marginBottom: 16,
  },
  h2: {
    color: colors.iron[100],
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  subtitle: {
    color: colors.iron[400],
    fontSize: 14,
  },
  monoLarge: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.iron[100],
  },
  monoMedium: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.iron[100],
  },
});
