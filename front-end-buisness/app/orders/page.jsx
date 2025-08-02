'use client';

import React, { useEffect } from 'react'
import OrdersList from './OrdersList'
import { useAuth } from '../store'
import { useRouter } from 'next/navigation';

export default function OrderPage() {
  const user = useAuth().user
  const router = useRouter();

  useEffect(() => {
    if(!user){
      router.push("/login");
    }
  }, [user]);
  
  return (
    <>
    <OrdersList />
    </>
  )
}
