// Catálogo de toldos — tipos, modelos reales (stock) y colores
export const AWNING_TYPES = [
    {
        id: 'brazo_extensible',
        label: 'Toldo Brazo Extensible o Invisible',
        icon: '🦾',
        description: 'Toldos para terrazas y chalets',
        // Hyper-descriptive prompt for Flux Kontext Pro (scene editing mode, no mask needed).
        // Describes the physical awning structure in detail so the model doesn't need a reference image.
        prompt: 'An elegant retractable folding-arm awning with three jointed folding arms. The frame is a minimalist slim aluminum structure with a very thin, unobtrusive mounting base. IMPORTANT: It has NO fabric valance, NO bulky cassette box, and NO hanging parts.',
        models: [
            // Using raw GitHub content for public access from Fal.ai
            { id: 'brazo_extensible_modelo1', label: 'Toldo Brazo Extensible', imageUrl: 'https://raw.githubusercontent.com/abraham3vg/tolderapp/main/public/catalogo/brazo_extensible.png' }
        ]
    }
];

export const AWNING_COLORS = [
    { id: 'blanco_roto', label: 'Blanco Roto', hex: '#F5F0E8', prompt: 'with an off-white cream colored canvas awning fabric' },
    { id: 'beige', label: 'Beige Arena', hex: '#C9B89A', prompt: 'with a warm beige sand colored canvas awning fabric' },
    { id: 'gris_antracita', label: 'Antracita', hex: '#3D3D3D', prompt: 'with a dark anthracite grey canvas awning fabric' },
    { id: 'verde_oliva', label: 'Verde Oliva', hex: '#6B7C3E', prompt: 'with an olive green canvas awning fabric' },
    { id: 'azul_marino', label: 'Azul Marino', hex: '#1E3A5F', prompt: 'with a navy blue canvas awning fabric' },
    { id: 'terracota', label: 'Terracota', hex: '#B85C38', prompt: 'with a terracotta burnt orange canvas awning fabric' },
    { id: 'negro', label: 'Negro Elegante', hex: '#1A1A1A', prompt: 'with a solid black canvas awning fabric' },
    { id: 'rayas_clasicas', label: 'Rayas Clásicas', hex: null, prompt: 'with a classic striped canvas, alternating white and blue stripes on the awning' },
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
