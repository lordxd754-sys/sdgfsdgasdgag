"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

function isYoutube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function youtubeVideoId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]+)/);
  return match?.[1] ?? "";
}
function youtubeEmbedUrl(url: string) {
  return `https://www.youtube.com/embed/${youtubeVideoId(url)}`;
}
function youtubeThumbnail(url: string) {
  return `https://img.youtube.com/vi/${youtubeVideoId(url)}/hqdefault.jpg`;
}

interface Props {
  videoUrl: string;
  exerciseName: string;
}

export function ExerciseVideoModal({ videoUrl, exerciseName }: Props) {
  const [open, setOpen] = useState(false);
  const yt = isYoutube(videoUrl);
  const thumbnail = yt
    ? youtubeThumbnail(videoUrl)
    : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full max-w-[240px] aspect-video rounded-xl overflow-hidden group bg-surface-container-high border border-outline-variant"
        aria-label={`Ver vídeo de ${exerciseName}`}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={exerciseName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-surface-container-highest" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined">play_arrow</span>
          </div>
        </div>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={exerciseName}
        className="max-w-2xl"
      >
        {yt ? (
          <iframe
            src={youtubeEmbedUrl(videoUrl)}
            title={exerciseName}
            className="w-full aspect-video rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={videoUrl} controls className="w-full rounded-xl" />
        )}
      </Modal>
    </>
  );
}
