import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum WhiteboardItemType {
  PATH = 'path',
  IMAGE = 'image',
  TEXT = 'text',
  SHAPE = 'shape',
}

@Entity()
@Index(['meetingId', 'isDeleted']) // Optimization for fetching active items
export class WhiteboardItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string; // Foreign Key to Meeting (can be linked later if Meeting entity exists)

  @Column()
  userId: string; // ID of the user who created this item

  @Column({
    type: 'enum',
    enum: WhiteboardItemType,
    default: WhiteboardItemType.PATH,
  })
  type: WhiteboardItemType;

  @Column('jsonb')
  data: any; // Stores points for paths, URL for images, text content, etc.

  @Column('jsonb', { default: {} })
  transform: {
    x: number;
    y: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  };

  @Column({ default: 0 })
  zIndex: number;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
