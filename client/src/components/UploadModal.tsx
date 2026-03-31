import { useState, useRef } from "react";
import { Upload as UploadIcon, X, FileVideo } from "lucide-react";
import * as videoApi from "../services/videoApi";
import { useToast } from "./Toast";
import ProgressBar from "./ProgressBar";
import { AxiosError } from "axios";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith("video/")) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (selected) {
      toast("Please select a valid video file", "error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      if (!title) {
        setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (dropped) {
      toast("Please drop a valid video file", "error");
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) return;

    setIsUploading(true);
    setProgress(0);

    try {
      await videoApi.uploadVideo(file, { title, description }, (p) => setProgress(p));
      toast("Video uploaded successfully", "success");
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      const message =
        error.response?.data?.message || error.message || "Upload failed";
      toast(message, "error");
    } finally {
      setIsUploading(false);
      setProgress(0);
      setFile(null);
      setTitle("");
      setDescription("");
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setTitle("");
      setDescription("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-white">Upload Video</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-zinc-900/30"
            >
              <UploadIcon className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-200 mb-1">Click or drag video to upload</p>
              <p className="text-xs text-zinc-500">MP4, WebM, OGG up to 500MB</p>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
              <div className="bg-emerald-500/20 p-2 rounded shrink-0">
                <FileVideo className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              {!isUploading && (
                <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-rose-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                placeholder="Video title"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          {isUploading && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar progress={progress} showLabel={false} size="md" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 mt-auto">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !title.trim() || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload Video"}
          </button>
        </div>
      </div>
    </div>
  );
}
