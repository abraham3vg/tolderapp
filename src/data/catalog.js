// Catálogo de toldos — tipos, modelos reales (stock) y colores
export const AWNING_TYPES = [
    {
        id: 'brazo_extensible',
        label: 'Toldo Brazo Extensible o Invisible',
        icon: '🦾',
        description: 'Toldos para terrazas y chalets',
        prompt: 'retractable awning with invisible folding arms, no side guides, sleek modern look, suitable for terrace or chalet',
        models: [
            // Using raw GitHub content for public access from Fal.ai
            { id: 'brazo_extensible_modelo1', label: 'Toldo Brazo Extensible', imageUrl: 'https://raw.githubusercontent.com/abraham3vg/tolderapp/main/public/catalogo/brazo_extensible.png' }
        ]
    }
];

export const AWNING_COLORS = [
    { id: 'blanco_roto', label: 'Blanco Roto', hex: '#F5F0E8', prompt: 'off-white cream canvas fabric' },
    { id: 'beige', label: 'Beige Arena', hex: '#C9B89A', prompt: 'warm beige sand colored fabric' },
    { id: 'gris_antracita', label: 'Antracita', hex: '#3D3D3D', prompt: 'dark anthracite grey canvas fabric' },
    { id: 'verde_oliva', label: 'Verde Oliva', hex: '#6B7C3E', prompt: 'olive green canvas fabric' },
    { id: 'azul_marino', label: 'Azul Marino', hex: '#1E3A5F', prompt: 'navy blue canvas fabric' },
    { id: 'terracota', label: 'Terracota', hex: '#B85C38', prompt: 'terracotta burnt orange canvas fabric' },
    { id: 'negro', label: 'Negro Elegante', hex: '#1A1A1A', prompt: 'solid black canvas fabric' },
    { id: 'rayas_clasicas', label: 'Rayas Clásicas', hex: null, prompt: 'classic striped awning canvas, alternating white and blue stripes' },
];

export const CATALOG_TEXTURES = {
    blanco_roto: '/textures/blanco_roto.jpg',
    beige: '/textures/beige.jpg',
    gris_antracita: '/textures/antracita.jpg',
    verde_oliva: '/textures/verde_oliva.jpg',
    azul_marino: '/textures/azul_marino.jpg',
    terracota: '/textures/terracota.jpg',
    negro: '/textures/negro.jpg',
    rayas_clasicas: '/textures/rayas_clasicas.jpg',
};
