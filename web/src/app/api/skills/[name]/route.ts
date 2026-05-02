import { NextResponse } from "next/server";
import { getSkillByName } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const skill = getSkillByName(decodeURIComponent(name));

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  return new NextResponse(skill.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${skill.name}.md"`,
    },
  });
}
