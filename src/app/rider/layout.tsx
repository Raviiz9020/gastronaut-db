
import React from 'react';

export default function RiderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="flex-1 flex flex-col">{children}</div>;
}
