import { useEffect } from 'react';

interface MetaTagsProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export function useMetaTags({ title, description, image, url }: MetaTagsProps) {
    useEffect(() => {
        const defaultTitle = "Mente Livre | Consejería psicológica online para universitarios";
        const defaultDescription = "Consigue apoyo psicológico profesional y accesible. Diseñado para estudiantes universitarios.";

        // Update Title
        const fullTitle = title ? `${title} | MenteLivre` : defaultTitle;
        document.title = fullTitle;

        // Helper to update or create meta tags
        const updateOrCreateMeta = (name: string, content: string, property: boolean = false) => {
            const attribute = property ? 'property' : 'name';
            let element = document.querySelector(`meta[${attribute}="${name}"]`);

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }

            element.setAttribute('content', content);
        };

        // Update Meta Tags
        updateOrCreateMeta('title', fullTitle);
        updateOrCreateMeta('description', description || defaultDescription);

        // Open Graph
        updateOrCreateMeta('og:title', fullTitle, true);
        updateOrCreateMeta('og:description', description || defaultDescription, true);
        if (image) updateOrCreateMeta('og:image', image, true);
        if (url) updateOrCreateMeta('og:url', url, true);
        updateOrCreateMeta('og:type', 'website', true);

        // Twitter
        updateOrCreateMeta('twitter:card', 'summary_large_image');
        updateOrCreateMeta('twitter:title', fullTitle);
        updateOrCreateMeta('twitter:description', description || defaultDescription);
        if (image) updateOrCreateMeta('twitter:image', image);

        return () => {
            // Revert to defaults on unmount
            document.title = defaultTitle;
            updateOrCreateMeta('title', defaultTitle);
            updateOrCreateMeta('description', defaultDescription);
            updateOrCreateMeta('og:title', defaultTitle, true);
            updateOrCreateMeta('og:description', defaultDescription, true);
        };
    }, [title, description, image, url]);
}
