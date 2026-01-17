import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  profileImage: string;

  // Voice enrollment fields (OpenVoice V2)
  @Column({ nullable: true })
  voiceEmbeddingS3Key: string; // S3 key: "voice-embeddings/{userId}.pth"

  @Column({ default: false })
  voiceDubbingEnabled: boolean; // Whether user has enabled voice dubbing

  @Column({ type: 'timestamp', nullable: true })
  voiceEnrolledAt: Date; // When voice was enrolled

  @OneToMany(() => Workspace, (workspace) => workspace.owner)
  workspaces: Workspace[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
