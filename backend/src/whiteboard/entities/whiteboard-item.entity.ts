import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WhiteboardItemType {
  PATH = 'path',
  IMAGE = 'image',
  TEXT = 'text',
  SHAPE = 'shape',
  STAMP = 'stamp',
  POSTIT = 'postit',
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

  @Column({ type: 'bigint', default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseInt(value, 10),
  }})
  zIndex: number; // bigint로 저장하여 Date.now() 값 지원

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
