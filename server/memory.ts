import crypto from "crypto";

export async function saveResumeVersion(db: any, userId: string, data: any) {
  return db.collection("resume_versions").add({
    userId,
    versionId: crypto.randomUUID(),
    createdAt: new Date(),
    inputHash: crypto.createHash('sha256')
      .update(JSON.stringify(data.input))
      .digest('hex'),
    output: data.output,
    score: data.score
  });
}
