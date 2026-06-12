import type { Intensive, IntensiveStatus } from '@/types/tutor';
import type {
  IntensivesBundle,
  IntensivesRepositoryResult,
} from '@/lib/supabase/intensives/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/intensives';

export async function fetchIntensivesBundleFromSupabase(): Promise<
  IntensivesRepositoryResult<IntensivesBundle>
> {
  return crmApiGet<IntensivesBundle>(BASE);
}

export async function insertIntensiveToSupabase(
  intensive: Intensive,
): Promise<IntensivesRepositoryResult<Intensive>> {
  return crmApiPost<Intensive>(BASE, { intensive });
}

export async function updateIntensiveTitleInSupabase(
  intensiveAppId: string,
  title: string,
): Promise<IntensivesRepositoryResult<Intensive>> {
  return crmApiPatch<Intensive>(`${BASE}/${encodeURIComponent(intensiveAppId)}`, {
    title,
  });
}

export async function deleteIntensiveFromSupabase(
  intensiveAppId: string,
): Promise<IntensivesRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(intensiveAppId)}`);
}

export async function updateStudentIntensiveProgressInSupabase(
  studentAppId: string,
  intensiveAppId: string,
  status: IntensiveStatus,
): Promise<IntensivesRepositoryResult<null>> {
  return crmApiPatch<null>(`${BASE}/progress`, {
    studentId: studentAppId,
    intensiveId: intensiveAppId,
    status,
  });
}

export async function seedIntensivesBundleToSupabase(
  bundle: IntensivesBundle,
): Promise<IntensivesRepositoryResult<IntensivesBundle>> {
  return crmApiPost<IntensivesBundle>(`${BASE}/seed`, bundle);
}
