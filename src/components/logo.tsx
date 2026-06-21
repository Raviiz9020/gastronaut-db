'use client';

import { useSiteSettings } from "@/context/site-settings-context";
import { cn } from "@/lib/utils";
import Image from "next/image";

const DefaultLogo = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-full h-full"
    >
        <path d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5zM12.26 12.26A5 5 0 0117 7s-2.2-5-5-5-5 2.2-5 5a5 5 0 014.74 5.26" />
        <path d="M12.63 7.63A5 5 0 0117.89 2" />
    </svg>
)

const Logo = ({ className }: { className?: string }) => {
    const { logoUrl } = useSiteSettings();

    if (logoUrl) {
        return (
            <div className={cn("relative", className)}>
                <Image src={logoUrl} alt="LR HyperDelivery Logo" fill className="object-contain" />
            </div>
        )
    }

    return (
        <div className={cn(className)}>
             <DefaultLogo />
        </div>
    )
}

export default Logo;
