export async function register() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const { logStudentsConnectionCheck } = await import(
    '@/lib/supabase/check-students-connection'
  );

  await logStudentsConnectionCheck(5);
}
