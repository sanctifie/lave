import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radii, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

/**
 * Scanner de code-barres plein écran. Dégradation gracieuse : si la permission
 * caméra est refusée, on propose de l'accorder ou de fermer pour saisir à la main.
 */
export function BarcodeScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  const handleScanned = (code: string) => {
    if (handled) return; // évite les doublons de scan
    setHandled(true);
    onScanned(code);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setHandled(false)}>
      <View style={styles.root}>
        {!permission ? (
          <View style={styles.center}><Text style={styles.msg}>Initialisation de la caméra…</Text></View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.icon}>📷</Text>
            <Text style={styles.msg}>
              Autorisez la caméra pour scanner les codes-barres, ou saisissez le produit à la main.
            </Text>
            <Pressable style={styles.btn} onPress={requestPermission}>
              <Text style={styles.btnTxt}>Autoriser la caméra</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostTxt}>Saisir à la main</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'upc_a', 'upc_e', 'qr'] }}
              onBarcodeScanned={({ data }) => handleScanned(data)}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>Alignez le code-barres du médicament</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeTxt}>Fermer</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  icon:   { fontSize: 44 },
  msg:    { ...typography.body, color: colors.text, textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  btnTxt:      { ...typography.label, color: colors.textOnDark },
  btnGhost:    { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
  btnGhostTxt: { ...typography.label, color: colors.textSecondary },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  frame: {
    width: 260, height: 160,
    borderWidth: 3, borderColor: '#fff', borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hint: { ...typography.bodyMedium, color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  closeBtn: {
    position: 'absolute', bottom: 44, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
  },
  closeTxt: { ...typography.label, color: '#fff' },
});
