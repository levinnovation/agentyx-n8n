import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "n8n_change_log", schema: "agentyx_audit" })
export class N8nChangeLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 20 })
  action!: string;

  @Column({ type: "varchar", length: 30 })
  objectType!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  objectId?: string;

  @Column({ type: "varchar", length: 255 })
  objectName!: string;

  @Column({ type: "varchar", length: 50 })
  tenant!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  domain?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  capability?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  assetName?: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  commitHash?: string;

  @Column({ type: "text", nullable: true })
  commitMessage?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  branch?: string;

  @Column({ type: "text", nullable: true })
  repositoryUrl?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  authorName?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  authorEmail?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  agentSkill?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  cliVersion?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  cliCommand?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  requestId?: string;

  @Column({ type: "varchar", length: 20 })
  n8nVersion!: string;

  @Column({ type: "text" })
  n8nInstanceUrl!: string;

  @Column({ type: "int", nullable: true })
  n8nSchemaVersion?: number;

  @Column({ type: "jsonb", nullable: true })
  previousValue?: unknown;

  @Column({ type: "jsonb", nullable: true })
  newValue?: unknown;

  @Column({ type: "jsonb", nullable: true })
  nodeChanges?: unknown;

  @Column({ type: "jsonb", nullable: true })
  connectionChanges?: unknown;

  @Column({ type: "text", nullable: true })
  diffSummary?: string;

  @CreateDateColumn({ type: "timestamptz" })
  deployedAt!: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  deployedBy?: string;

  @Column({ type: "varchar", length: 20, default: "success" })
  deploymentStatus!: string;

  @Column({ type: "text", nullable: true })
  errorMessage?: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  rollbackHash?: string;
}
