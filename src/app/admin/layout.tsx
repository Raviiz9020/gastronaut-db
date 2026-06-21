
import React from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout is minimal to avoid showing the main app's header and sidebar
    // in the admin section.
    return <div className="flex-1 flex flex-col">{children}</div>;
}
