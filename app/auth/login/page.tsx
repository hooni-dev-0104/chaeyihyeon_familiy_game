'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  // 페이지를 리다이렉트 시키므로 이 파일은 사용되지 않아야 하지만
  // 안전을 위해 홈 화면과 동일하게 구성하거나 리다이렉트 처리
  const router = useRouter();
  
  if (typeof window !== 'undefined') {
    router.push('/');
  }

  return null;
}
