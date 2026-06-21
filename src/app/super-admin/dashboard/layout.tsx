'use client';

import React, { useEffect, useState } from 'react';
import SuperAdminSidebar from './super-admin-sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/context/super-admin-context';

export default function SuperAdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { superAdmin, logout } = useSuperAdmin();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!superAdmin) {
            router.replace('/super-admin/login');
        }
    }, [superAdmin, router]);

    const handleLogout = () => {
        logout();
        router.push('/super-admin/login');
    };

    if (!isMounted || !superAdmin) {
        return (
             <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            <SuperAdminSidebar />
            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="flex items-center justify-end p-4 border-b border-destructive/10 gap-4">
                    <p className="text-base text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{superAdmin.name}</span>!</p>
                    <Button
                      onClick={handleLogout}
                      className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                    >
                        <LogOut className="mr-2 h-4 w-4"/>
                        <span>Logout</span>
                    </Button>
                </header>
                <div className="flex-1 overflow-y-auto">
                   {children}
                </div>
            </main>
        </div>
    );
}
