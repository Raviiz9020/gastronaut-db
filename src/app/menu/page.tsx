
import React, { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MenuItem as MenuItemType, Category } from '@/types';
import MenuPageContent from './menu-page';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';

type Props = {
    params: { [key: string]: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

const SITE_URL = 'https://hyperdelivery.shop';
const FALLBACK_IMAGE_URL = 'https://hyperdelivery.shop/og-image.png';
const SITE_NAME = 'HyperDelivery';

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
    const { searchParams } = props;
    const rawItemParam = searchParams?.item;
    const itemParam = Array.isArray(rawItemParam) ? rawItemParam[0] : (rawItemParam as string | undefined);
    
    const rawCategoryParam = searchParams?.category;
    const categoryName = Array.isArray(rawCategoryParam) ? rawCategoryParam[0] : (rawCategoryParam as string | undefined);
    
    if (itemParam) {
        try {
            const docRef = doc(db, 'menuItems', itemParam as string);
            const itemDoc = await getDoc(docRef);
            
            if (itemDoc.exists()) {
                const item = { id: itemDoc.id, ...itemDoc.data() } as MenuItemType;
                const fullUrl = `${SITE_URL}/menu?item=${encodeURIComponent(item.id)}`;
                const title = `${item.name} - ${SITE_NAME}`;
                const description = item.description || `Order ${item.name} now from ${item.shopName} on ${SITE_NAME}.`;
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
                            width: 1200,
                            height: 630,
                            alt: item.name || 'HyperDelivery Menu Item',
                            type: 'image/png',
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
                const title = `${SITE_NAME} - ${category.name}`;
                const description = `Explore all items in the ${category.name} category.`;
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
                            width: 1200,
                            height: 630,
                            alt: category.name || 'HyperDelivery Food Category',
                            type: 'image/png',
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

    // Fallback metadata
    const defaultTitle = `Order Now on ${SITE_NAME}`;
    const defaultDescription = 'Explore a variety of local vendors and home chefs.';
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
                width: 1200,
                height: 630,
                alt: `${SITE_NAME} Logo`,
                type: 'image/png',
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


export default function MenuPage() {
    return (
        <Suspense fallback={<MenuPageFallback />}>
            <MenuPageContent />
        </Suspense>
    );
}
