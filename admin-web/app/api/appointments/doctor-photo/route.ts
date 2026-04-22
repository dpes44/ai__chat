import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import { invalidCsrfResponse } from "@/lib/server/core/http";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { uploadDoctorPhoto } from "@/lib/server/domains/appointments/doctor-photo/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminSessionRoute({
    fallbackMessage: "Could not upload doctor photo.",
    handler: async (session) => {
      const formData = await request.formData();
      const csrfToken = formData.get("csrfToken")?.toString().trim() ?? "";
      if (!assertCsrfToken(csrfToken)) {
        return invalidCsrfResponse();
      }

      const data = await uploadDoctorPhoto({
        actor: session.sub,
        formData,
      });

      return NextResponse.json({
        ok: true,
        data,
      });
    },
  });
}
