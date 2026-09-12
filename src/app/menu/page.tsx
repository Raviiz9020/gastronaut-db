
import React, { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MenuItem as MenuItemType, Category } from '@/types';
import MenuPageContent from './menu-page';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';

type Props = {
    params: Promise<{ [key: string]: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const SITE_URL = 'https://hyperdelivery.in';
const FALLBACK_IMAGE_URL = 'https://hyperdelivery.in/og-image.png';
const SITE_NAME = 'HyperDelivery';

export async function generateMetadata(
    props: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const rawItemParam = searchParams?.item;
    const itemParam = Array.isArray(rawItemParam) ? rawItemParam[0] : (rawItemParam as string | undefined);

    const rawCategoryParam = searchParams?.category;
    const categoryName = Array.isArray(rawCategoryParam) ? rawCategoryParam[0] : (rawCategoryParam as string | undefined);

    const rawVendorParam = searchParams?.vendor;
    const vendorParam = Array.isArray(rawVendorParam) ? rawVendorParam[0] : (rawVendorParam as string | undefined);

    if (itemParam) {
        try {
            const docRef = doc(db, 'menuItems', itemParam as string);
            let itemDoc = await getDoc(docRef);
            let item: MenuItemType | null = null;

            if (itemDoc.exists()) {
                item = { id: itemDoc.id, ...itemDoc.data() } as MenuItemType;
            } else {
                const q = query(collection(db, 'menuItems'), where('slug', '==', itemParam), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    item = { id: snap.docs[0].id, ...snap.docs[0].data() } as MenuItemType;
                }
            }

            if (item) {
                const fullUrl = `${SITE_URL}/menu?item=${encodeURIComponent(item.id)}`;
                const title = `${item.name} - ${item.shopName || SITE_NAME}`;
                const description = item.description || `Order ${item.name} now from ${item.shopName || 'local kitchens'} on ${SITE_NAME}. Fresh, fast & reliable delivery.`;
                const rawImageUrl = (typeof item.image === 'string' && item.image.trim()) ? item.image : FALLBACK_IMAGE_URL;
                const imageUrl = rawImageUrl.replace(/&amp;/g, '&');

                return {
                    title: title,
                    description: description,
                    openGraph: {
                        title: title,
                        description: description,
                        url: fullUrl,
                        siteName: SITE_NAME,
                        locale: 'en_IN',
                        type: 'website',
                        images: [{
                            url: imageUrl,
                            secureUrl: imageUrl,
                            alt: item.name || 'HyperDelivery Menu Item',
                        }],
                    },
                    twitter: {
                        card: 'summary_large_image',
                        title: title,
                        description: description,
                        images: [imageUrl],
                    },
                };
            }
        } catch (error) {
            console.error("Error fetching item metadata:", error);
        }
    }

    if (categoryName) {
        try {
            const q = query(collection(db, 'categories'), where('name', '==', categoryName), limit(1));
            const categorySnap = await getDocs(q);

            if (!categorySnap.empty) {
                const category = categorySnap.docs[0].data() as Category;
                const fullUrl = `${SITE_URL}/menu?category=${encodeURIComponent(category.name)}`;
                const title = `${category.name} - ${SITE_NAME}`;
                const description = `Explore delicious ${category.name} options on ${SITE_NAME}.`;
                const rawImageUrl = (typeof category.imageUrl === 'string' && category.imageUrl.trim()) ? category.imageUrl : FALLBACK_IMAGE_URL;
                const imageUrl = rawImageUrl.replace(/&amp;/g, '&');

                return {
                    title: title,
                    description: description,
                    openGraph: {
                        title: title,
                        description: description,
                        url: fullUrl,
                        siteName: SITE_NAME,
                        locale: 'en_IN',
                        type: 'website',
                        images: [{
                            url: imageUrl,
                            secureUrl: imageUrl,
                            alt: category.name || 'HyperDelivery Food Category',
                        }],
                    },
                    twitter: {
                        card: 'summary_large_image',
                        title: title,
                        description: description,
                        images: [imageUrl],
                    },
                };
            }
        } catch (error) {
            console.error("Error fetching category metadata:", error);
        }
    }

    if (vendorParam) {
        try {
            let vendorData: any = null;
            const vendorDoc = await getDoc(doc(db, 'vendors', vendorParam));
            if (vendorDoc.exists()) {
                vendorData = { id: vendorDoc.id, ...vendorDoc.data() };
            } else {
                const q = query(collection(db, 'vendors'), where('slug', '==', vendorParam), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    vendorData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                }
            }

            if (vendorData) {
                const vendorName = vendorData.shopName || vendorData.name || SITE_NAME;
                const title = `${vendorName} - ${SITE_NAME}`;
                const description = vendorData.description || `Order online from ${vendorName} on ${SITE_NAME}.`;
                const rawImageUrl = (typeof vendorData.imageUrl === 'string' && vendorData.imageUrl.trim())
                    ? vendorData.imageUrl
                    : (typeof vendorData.coverImage === 'string' && vendorData.coverImage.trim())
                        ? vendorData.coverImage
                        : FALLBACK_IMAGE_URL;
                const imageUrl = rawImageUrl.replace(/&amp;/g, '&');
                const fullUrl = `${SITE_URL}/menu?vendor=${encodeURIComponent(vendorParam)}`;

                return {
                    title: title,
                    description: description,
                    openGraph: {
                        title: title,
                        description: description,
                        url: fullUrl,
                        siteName: SITE_NAME,
                        locale: 'en_IN',
                        type: 'website',
                        images: [{
                            url: imageUrl,
                            secureUrl: imageUrl,
                            alt: vendorName,
                        }],
                    },
                    twitter: {
                        card: 'summary_large_image',
                        title: title,
                        description: description,
                        images: [imageUrl],
                    },
                };
            }
        } catch (error) {
            console.error("Error fetching vendor metadata:", error);
        }
    }

    // Fallback metadata
    const defaultTitle = `Order Now on ${SITE_NAME}`;
    const defaultDescription = 'Explore a variety of local vendors and home chefs on HyperDelivery.';
    return {
        title: defaultTitle,
        description: defaultDescription,
        openGraph: {
            title: defaultTitle,
            description: defaultDescription,
            url: SITE_URL,
            siteName: SITE_NAME,
            locale: 'en_IN',
            type: 'website',
            images: [{
                url: FALLBACK_IMAGE_URL,
                secureUrl: FALLBACK_IMAGE_URL,
                alt: `${SITE_NAME} Logo`,
            }],
        },
        twitter: {
            card: 'summary_large_image',
            title: defaultTitle,
            description: defaultDescription,
            images: [FALLBACK_IMAGE_URL],
        }
    };
}

const MenuPageFallback = () => (
    <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    </div>
);


export default async function MenuPage(props: Props) {
    await props.searchParams;
    return (
        <Suspense fallback={<MenuPageFallback />}>
            <MenuPageContent />
        </Suspense>
    );
}
