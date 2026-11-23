import React from 'react';
import { SoundSynth } from '../renderer/soundSynth';
import { StudioRenderer } from '../renderer/studioRenderer';

export interface VideoRecordToggleInput {
  recording: boolean;
  videoFps: 30 | 60 | 120;
  recorderRef: React.MutableRefObject<MediaRecorder | null>;
  rendererRef: React.MutableRefObject<StudioRenderer | null>;
  soundRef: React.MutableRefObject<SoundSynth | null>;
  setRecording: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  showToast: (msg: string) => void;
}

export function toggleStudioVideoRecord(input: VideoRecordToggleInput): void {
  const {
    recording,
    videoFps,
    recorderRef,
    rendererRef,
    soundRef,
    setRecording,
    setPlaying,
    showToast
  } = input;

  if (recording) {
    recorderRef.current?.stop();
    setRecording(false);
    return;
  }
  const canvas = rendererRef.current?.app?.canvas;
  if (!canvas || typeof MediaRecorder === 'undefined') {
    showToast('تصوير WebM غير مدعوم في هذا المتصفح');
    return;
  }

  if (rendererRef.current) rendererRef.current.hideUIHelpers = true;
  const videoStream = canvas.captureStream(videoFps);
  const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  const audioStream = soundRef.current?.getAudioStream();
  if (audioStream) {
    audioStream.getAudioTracks().forEach((t) => tracks.push(t));
  }
  const combinedStream = new MediaStream(tracks);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const targetBitrate = videoFps === 120 ? 16_000_000 : videoFps === 60 ? 10_000_000 : 6_000_000;
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: targetBitrate });
  } catch {
    recorder = new MediaRecorder(combinedStream, { mimeType });
  }
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };
  recorder.onstop = () => {
    if (rendererRef.current) rendererRef.current.hideUIHelpers = false;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-${videoFps}fps-${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast(`✅ تم حفظ الفيديو (${videoFps} FPS)`);
  };

  recorderRef.current = recorder;
  recorder.start(250);
  setRecording(true);
  setPlaying(true);
  showToast(`🔴 بدأ تسجيل الفيديو (${videoFps} FPS)`);
}
