import mongoose, { Schema } from 'mongoose';
import { IVideo } from '../types';

const videoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    resolution: {
      type: String,
      default: '',
    },
    path: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed'],
      default: 'pending',
    },
    sensitivityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sensitivityLabel: {
      type: String,
      enum: ['safe', 'flagged'],
      default: 'safe',
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound Indexes for efficient multi-tenant queries ────

videoSchema.index({ userId: 1, status: 1 });
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ userId: 1, sensitivityLabel: 1 });

const Video = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
