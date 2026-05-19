import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "workflow_entity", schema: "n8n" })
export class WorkflowEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 128 })
  name!: string;

  @Column({ type: "json" })
  nodes!: unknown;

  @Column({ type: "json" })
  connections!: unknown;

  @Column({ type: "json", nullable: true })
  settings?: unknown;

  @Column({ type: "boolean", default: false })
  active!: boolean;

  @Column({ type: "varchar", length: 36, nullable: true })
  versionId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @Column({ type: "boolean", default: false })
  isArchived!: boolean;

  @Column({ type: "json", nullable: true })
  meta?: unknown;

  @Column({ type: "json", nullable: true })
  staticData?: unknown;

  @Column({ type: "json", nullable: true })
  pinData?: unknown;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "int", default: 1 })
  versionCounter!: number;
}

@Entity({ name: "credentials_entity", schema: "n8n" })
export class CredentialsEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 128 })
  name!: string;

  @Column({ type: "varchar", length: 128 })
  type!: string;

  @Column({ type: "json", nullable: true })
  data?: unknown;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ name: "variable_entity", schema: "n8n" })
export class VariableEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 128 })
  key!: string;

  @Column({ type: "text" })
  value!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ name: "tag_entity", schema: "n8n" })
export class TagEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 128, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 7, nullable: true })
  color?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ name: "webhook_entity", schema: "n8n" })
export class WebhookEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 128 })
  webhookPath!: string;

  @Column({ type: "varchar", length: 128 })
  method!: string;

  @Column({ type: "varchar", length: 36 })
  workflowId!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  nodeId?: string;

  @Column({ type: "boolean", default: false })
  isTest!: boolean;
}

@Entity({ name: "shared_workflow", schema: "n8n" })
export class SharedWorkflow {
  @PrimaryColumn("uuid")
  workflowId!: string;

  @PrimaryColumn("uuid")
  userId!: string;

  @Column({ type: "varchar", length: 50 })
  role!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
