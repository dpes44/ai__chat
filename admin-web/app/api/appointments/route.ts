import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { appointmentsPostSchema } from "@/lib/server/contracts/appointments";
import {
  listAppointmentsData,
  updateAppointmentStatus,
  upsertDoctor,
} from "@/lib/server/domains/appointments/service";

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.appointments,
    failureTarget: "GET /api/appointments",
    handler: async () => {
      const data = await listAppointmentsData();
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.appointments,
    failureTarget: "POST /api/appointments",
    handler: async (session) => {
      const body = await request.json();
      const parsed = appointmentsPostSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const detail = issue?.message ?? "Invalid payload.";
        return invalidPayloadResponse(detail);
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
      }

      if (parsed.data.action === "upsertDoctor") {
        const result = await upsertDoctor({
          actor: session.sub,
          doctorId: parsed.data.doctorId,
          name: parsed.data.name,
          specialization: parsed.data.specialization,
          bio: parsed.data.bio,
          location: parsed.data.location,
          profileLink: parsed.data.profileLink,
          photoUrl: parsed.data.photoUrl,
          isActive: parsed.data.isActive,
        });
        return NextResponse.json({ ok: true, doctorId: result.doctorId });
      }

      await updateAppointmentStatus({
        actor: session.sub,
        appointmentId: parsed.data.appointmentId,
        status: parsed.data.status,
        adminNote: parsed.data.adminNote,
      });

      return NextResponse.json({ ok: true });
    },
  });
}
