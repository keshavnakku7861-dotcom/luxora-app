/* Luxora UI translations. Language comes from the Settings > Region > Language preference (LuxoraPrefs.language).
   French (fr-*) translates the interface text: navigation, buttons, headings, settings, labels, toasts, dialogs and product notes.
   Other languages keep the English text (number/currency formatting still follows the chosen language).
   Chat replies come from the English assistant and are not translated. Implementation: exact-string dictionary + a few patterns,
   applied to text nodes and a few attributes, kept in sync with a MutationObserver. English originals are remembered so switching back restores them. */
(() => {
  const FR = {
    // chat / assistant
    'AI Assistant': 'Assistant IA', 'New chat': 'Nouvelle discussion', 'Message': 'Message', 'Add attachment': 'Ajouter une pièce jointe', 'Add attachment ': 'Ajouter une pièce jointe',
    'What can I help you shop for today?': 'Que puis-je vous aider à acheter aujourd’hui ?',
    'Describe what you need and Luxora will analyze your options, compare trusted brands and recommend the best products with confidence.': 'Décrivez ce dont vous avez besoin : Luxora analyse vos options, compare des marques de confiance et recommande les meilleurs produits en toute confiance.',
    'Electronics': 'Électronique', 'Discover the latest gadgets and tech': 'Découvrez les derniers gadgets et technologies', 'Groceries': 'Épicerie', 'Everyday essentials and fresh food': 'Produits du quotidien et produits frais',
    'Fashion': 'Mode', 'Clothing, shoes and accessories': 'Vêtements, chaussures et accessoires', 'Ask about any product, price, or brand...': 'Posez une question sur un produit, un prix ou une marque...', 'Ask about any product, price, or brand…': 'Posez une question sur un produit, un prix ou une marque…',
    'Send': 'Envoyer', 'Back to chat': 'Retour à la discussion', 'Close': 'Fermer', 'Recommended for you': 'Recommandé pour vous', 'Top suggested picks': 'Meilleures suggestions', 'Top suggested': 'Meilleures suggestions',
    'Side by side': 'Côte à côte', 'Your pick': 'Votre choix', 'Closest match': 'Meilleure correspondance',
    'Want me to add one of them to your cart?': 'Voulez-vous que j’en ajoute un à votre panier ?', 'Want me to save one for later?': 'Voulez-vous que j’en enregistre un pour plus tard ?',
    'Want me to compare any of these, or save one for later?': 'Voulez-vous que j’en compare quelques-uns ou que j’en enregistre un pour plus tard ?', 'Want me to save it, or compare it with another one?': 'Voulez-vous que je l’enregistre ou que je le compare à un autre ?',
    'Illustrative image': 'Image illustrative', 'Previous image': 'Image précédente', 'Next image': 'Image suivante', 'Image 1': 'Image 1', 'Image 2': 'Image 2', 'Image 3': 'Image 3', 'Photo 1': 'Photo 1', 'Photo 2': 'Photo 2', 'Photo 3': 'Photo 3',
    'Size': 'Taille', '(required)': '(obligatoire)', 'Sizing kit': 'Kit de tailles', 'Select your size': 'Choisissez votre taille', 'Select a size': 'Choisissez une taille', 'Please select a size before adding this to your cart.': 'Veuillez choisir une taille avant d’ajouter ce produit au panier.',
    'Size 6': 'Taille 6', 'Size 7': 'Taille 7', 'Size 8': 'Taille 8', 'Size 9': 'Taille 9', 'Size 10': 'Taille 10', 'Size 11': 'Taille 11', 'One size': 'Taille unique',
    'Select color': 'Choisissez la couleur', 'Color:': 'Couleur :', 'Quantity': 'Quantité', 'Decrease': 'Diminuer', 'Increase': 'Augmenter', 'Save for later': 'Enregistrer pour plus tard',
    'Silver': 'Argent', 'silver': 'argent', 'Black': 'Noir', 'black': 'noir', 'Gray': 'Gris', 'gray': 'gris', 'White': 'Blanc', 'white': 'blanc', 'Standard': 'Standard', 'standard': 'standard',
    'Add to Cart': 'Ajouter au panier', 'Add to cart': 'Ajouter au panier', 'Choose size': 'Choisir la taille', 'Add to demo cart': 'Ajouter au panier démo', 'Demo checkout': 'Paiement démo',
    '(opens in a new tab)': '(s’ouvre dans un nouvel onglet)', '(opens Amazon in a new tab)': '(ouvre Amazon dans un nouvel onglet)', 'Buy on Amazon': 'Acheter sur Amazon', 'Source': 'Source',
    'Confirm & Let AI Process': 'Confirmer et laisser l’IA traiter', 'Confirm &amp; Let AI Process': 'Confirmer et laisser l’IA traiter',
    'As an Amazon Associate, Luxora earns from qualifying purchases.': 'En tant que Partenaire Amazon, Luxora réalise un bénéfice sur les achats remplissant les conditions requises.',
    'Confirm your ring size at Oura before you buy; a sizing kit is recommended.': 'Confirmez votre taille de bague chez Oura avant d’acheter ; un kit de tailles est recommandé.',
    // shell / nav
    'Main': 'Principal', 'Luxora home': 'Accueil Luxora', 'Assistant': 'Assistant', 'Shop and cart': 'Boutique et panier', 'Shop & cart': 'Boutique et panier', 'Shop by category': 'Parcourir par catégorie',
    'Your account': 'Votre compte', 'Settings': 'Paramètres', 'Sign in': 'Se connecter', 'Log out': 'Se déconnecter', 'Open cart': 'Ouvrir le panier', 'Cart': 'Panier', 'Shopping cart': 'Panier d’achats', 'Close cart': 'Fermer le panier',
    'Shop': 'Boutique', 'Search products': 'Rechercher des produits', 'Luxora product guide': 'Guide produits Luxora', 'All products': 'Tous les produits', 'Sort by': 'Trier par', 'Sort: Featured': 'Tri : à la une', 'Price: low to high': 'Prix : croissant', 'Price: high to low': 'Prix : décroissant',
    'Breadcrumb': 'Fil d’Ariane', 'Categories': 'Catégories', 'All': 'Tous', 'Smart rings': 'Bagues connectées', 'Smartwatches': 'Montres connectées', 'Earbuds': 'Écouteurs', 'Headphones': 'Casques', 'Deals': 'Offres',
    'Featured': 'À la une', 'Never miss a deal': 'Ne manquez aucune offre', 'Get Luxora deals and updates by email. Opt-in only.': 'Recevez les offres et nouveautés Luxora par e-mail. Sur inscription uniquement.',
    'Verified lower prices on selected products.': 'Prix plus bas vérifiés sur certains produits.', 'Prices checked Nov 3, 2026; they can change at any time.': 'Prix vérifiés le 3 nov. 2026 ; ils peuvent changer à tout moment.', 'See all deals': 'Voir toutes les offres', 'Deal': 'Offre', 'Deal.': 'Offre.',
    'You may also like': 'Vous aimerez aussi', 'Over budget': 'Hors budget', 'Over your budget': 'Au-dessus de votre budget', 'No products found': 'Aucun produit trouvé', 'Try another search or category.': 'Essayez une autre recherche ou catégorie.', 'Show all products': 'Afficher tous les produits',
    'Luxora shop · prices checked Nov 3, 2026': 'Boutique Luxora · prix vérifiés le 3 nov. 2026',
    "Real products with prices checked Nov 3, 2026. Luxora doesn't sell anything: use Buy at to purchase from the retailer. Our cart is a demo and no payment is ever taken.": 'Produits réels, prix vérifiés le 3 nov. 2026. Luxora ne vend rien : utilisez « Acheter chez » pour acheter auprès du revendeur. Notre panier est une démo et aucun paiement n’est jamais prélevé.',
    "Real products; prices checked Nov 3, 2026 and subject to change. Product pictures are illustrative, not official photos. As an Amazon Associate, Luxora earns from qualifying purchases. Buy at the retailer; Luxora's cart and checkout are a demonstration only, with no payment and no order.": 'Produits réels ; prix vérifiés le 3 nov. 2026 et susceptibles de changer. Les images sont illustratives, pas des photos officielles. En tant que Partenaire Amazon, Luxora réalise un bénéfice sur les achats remplissant les conditions requises. Achetez chez le revendeur ; le panier et le paiement de Luxora ne sont qu’une démonstration, sans paiement ni commande.',
    "Luxora doesn't sell this. The button opens": 'Luxora ne vend pas ce produit. Le bouton ouvre',
    // cart / drawer / checkout
    'Your cart': 'Votre panier', 'Your cart is empty': 'Votre panier est vide', 'Add something you like from the store.': 'Ajoutez un article qui vous plaît depuis la boutique.', 'Continue shopping': 'Continuer vos achats', '← Continue shopping': '← Continuer vos achats',
    'Remove': 'Retirer', 'Subtotal': 'Sous-total', 'Shipping': 'Livraison', 'Free': 'Gratuite', 'Total': 'Total', 'Checkout (demo)': 'Paiement (démo)', 'Checkout': 'Paiement', 'View cart': 'Voir le panier', 'View saved': 'Voir les articles enregistrés',
    'DEMO CHECKOUT · NO REAL PAYMENT': 'PAIEMENT DÉMO · AUCUN PAIEMENT RÉEL', 'These fields are optional and are': 'Ces champs sont facultatifs et', 'never saved or sent anywhere': 'ne sont jamais enregistrés ni envoyés', '. Do not enter real personal or card details.': '. Ne saisissez pas de vraies données personnelles ou de carte.',
    'Full name': 'Nom complet', 'Shipping address': 'Adresse de livraison', 'Delivery': 'Livraison', 'Standard (3-5 days)': 'Standard (3 à 5 jours)', 'Express (1-2 days)': 'Express (1 à 2 jours)', 'Payment': 'Paiement',
    'Demo payment. No card is requested and nothing is charged.': 'Paiement de démonstration. Aucune carte n’est demandée et rien n’est débité.', 'Place demo order': 'Passer la commande démo', 'Back to cart': 'Retour au panier', 'Demo order placed': 'Commande démo passée',
    'Demo Shopper': 'Client démo', 'demo@example.com': 'demo@example.com', '123 Sample Street': '123 rue de l’Exemple',
    // saved
    'Your favorites': 'Vos favoris', 'Saved items': 'Articles enregistrés', 'Move all to cart': 'Tout déplacer dans le panier', 'No saved items yet': 'Aucun article enregistré',
    'Tap the heart on any product to keep it here for later.': 'Touchez le cœur sur un produit pour le garder ici pour plus tard.', 'Browse the shop': 'Parcourir la boutique', 'Removed from saved': 'Retiré des favoris',
    'Get Luxora deals': 'Recevoir les offres Luxora', 'Hear when your saved items go on sale. Opt-in only.': 'Soyez prévenu quand vos articles enregistrés sont en promotion. Sur inscription uniquement.',
    'Name': 'Nom', '(optional)': '(facultatif)', 'Email': 'E-mail', 'Sign up': 'S’inscrire', 'Signing up...': 'Inscription...', 'Email me Luxora deals and updates': 'M’envoyer par e-mail les offres et nouveautés Luxora',
    'Prototype: your email goes to our sign-up form provider (Forminit) and is used only for Luxora deals and updates.': 'Prototype : votre e-mail est transmis à notre prestataire de formulaire d’inscription (Forminit) et sert uniquement aux offres et nouveautés Luxora.',
    'Your name': 'Votre nom', 'you@example.com': 'vous@exemple.com',
    // sign-in dialog
    'Sign in or create an account': 'Se connecter ou créer un compte', 'Enter your name and email to save your profile on Luxora.': 'Saisissez votre nom et votre e-mail pour enregistrer votre profil sur Luxora.', 'Continue': 'Continuer',
    'No password needed. This is a prototype: your name and email are saved only in this browser and are not sent anywhere.': 'Aucun mot de passe requis. Ceci est un prototype : votre nom et votre e-mail sont enregistrés uniquement dans ce navigateur et ne sont envoyés nulle part.',
    // settings
    'Profile': 'Profil', 'Notifications': 'Notifications', 'Shopping preferences': 'Préférences d’achat', 'Region': 'Région', 'Language & currency': 'Langue et devise', 'Help & About': 'Aide et à propos', 'Appearance': 'Apparence', 'AI assistant': 'Assistant IA', 'Privacy & data': 'Confidentialité et données', 'Help & support': 'Aide et assistance', 'About Luxora': 'À propos de Luxora', 'Settings sections': 'Sections des paramètres',
    'You are not signed in. Sign in to save your name and email on this device.': 'Vous n’êtes pas connecté. Connectez-vous pour enregistrer votre nom et votre e-mail sur cet appareil.',
    'Deal alerts': 'Alertes d’offres', 'Show current deals in the store.': 'Afficher les offres en cours dans la boutique.', 'Price-drop alerts': 'Alertes de baisse de prix', 'Highlight discounts with price-drop badges on products.': 'Mettre en avant les remises avec des badges de baisse de prix et le prix barré.',
    'Order updates': 'Suivi des commandes', 'Saved for when real orders exist. Demo orders never ship.': 'Enregistré pour quand de vraies commandes existeront. Les commandes démo ne sont jamais expédiées.',
    'Opt in to deal emails. Off by default.': 'S’abonner aux e-mails d’offres. Désactivé par défaut.', 'One last step: confirm your email below to join the list. Nothing is sent until you press Sign up.': 'Dernière étape : confirmez votre e-mail ci-dessous pour rejoindre la liste. Rien n’est envoyé avant que vous n’appuyiez sur S’inscrire.',
    'Favorite categories': 'Catégories favorites', 'Preferred brands': 'Marques préférées', 'Default sort in the store': 'Tri par défaut dans la boutique', 'Budget limit (US dollars, optional)': 'Budget maximum (dollars US, facultatif)', 'No limit': 'Sans limite',
    "Favorites move to the top of the Featured list. A budget limit marks pricier products and is applied to assistant questions that don't name a budget.": 'Les favoris remontent en haut de la liste « À la une ». Un budget maximum signale les produits plus chers et s’applique aux questions à l’assistant qui ne mentionnent pas de budget.',
    'Language': 'Langue', 'Currency': 'Devise', 'Country': 'Pays',
    'US dollar (USD)': 'Dollar américain (USD)', 'Euro (EUR)': 'Euro (EUR)', 'British pound (GBP)': 'Livre sterling (GBP)', 'Canadian dollar (CAD)': 'Dollar canadien (CAD)', 'Indian rupee (INR)': 'Roupie indienne (INR)',
    'United States': 'États-Unis', 'Canada': 'Canada', 'United Kingdom': 'Royaume-Uni', 'India': 'Inde', 'Germany': 'Allemagne', 'France': 'France', 'Spain': 'Espagne', 'Australia': 'Australie',
    'Prices are in US dollars at the retailer and convert at fixed, approximate rates (not live exchange rates). Language changes number formatting, and French also translates the interface text; other languages stay in English for now.': 'Les prix sont en dollars américains chez le revendeur et convertis à des taux fixes approximatifs (pas les taux de change en direct). La langue modifie le format des nombres, et le français traduit aussi le texte de l’interface ; les autres langues restent en anglais pour l’instant.',
    'Theme': 'Thème', 'Light': 'Clair', 'Dark': 'Sombre', 'System': 'Système', 'Text size': 'Taille du texte', 'Small': 'Petite', 'Default': 'Par défaut', 'Large': 'Grande',
    'Reply length': 'Longueur des réponses', 'Short': 'Courtes', 'Standard ': 'Standard', 'Detailed': 'Détaillées', 'Show product cards in chat': 'Afficher les fiches produits dans la discussion', 'When off, the assistant lists product names in text.': 'Si désactivé, l’assistant liste les noms de produits en texte.',
    'Remember chat history': 'Mémoriser l’historique des discussions', 'Keep your conversation on this device between visits.': 'Conserver votre conversation sur cet appareil entre les visites.',
    'Everything is stored only in this browser. Clearing or deleting asks you to confirm first.': 'Tout est stocké uniquement dans ce navigateur. Effacer ou supprimer demande d’abord une confirmation.',
    'Chat history': 'Historique des discussions', 'Nothing saved': 'Rien d’enregistré', 'Clear chat history': 'Effacer l’historique', 'Clear saved items': 'Effacer les articles enregistrés', 'Clear cart': 'Vider le panier',
    'Download my data': 'Télécharger mes données', 'A JSON file with your profile, settings, chat, saved items and cart.': 'Un fichier JSON avec votre profil, vos paramètres, vos discussions, vos articles enregistrés et votre panier.', 'Download JSON': 'Télécharger le JSON',
    'Delete my profile': 'Supprimer mon profil', 'Removes your profile, settings, chat, saved items and cart from this device.': 'Supprime votre profil, vos paramètres, vos discussions, vos articles enregistrés et votre panier de cet appareil.', 'Delete profile': 'Supprimer le profil',
    'Is Luxora a real store?': 'Luxora est-il une vraie boutique ?', "No. Luxora is a prototype assistant, not a store. The products, brands and prices are real and were checked on Nov 3, 2026, but Luxora does not sell anything: the Buy at button opens the retailer in a new tab. Luxora's own cart and checkout are a demo that takes no payment and places no order.": 'Non. Luxora est un assistant prototype, pas une boutique. Les produits, marques et prix sont réels et ont été vérifiés le 3 nov. 2026, mais Luxora ne vend rien : le bouton « Acheter chez » ouvre le revendeur dans un nouvel onglet. Le panier et le paiement de Luxora sont une démo qui ne prélève aucun paiement et ne passe aucune commande.',
    'Where is my data stored?': 'Où sont stockées mes données ?', 'In this browser only (local storage): your profile, settings, chat history, saved items and cart. See Privacy & data below to download or erase it.': 'Uniquement dans ce navigateur (stockage local) : votre profil, vos paramètres, l’historique des discussions, les articles enregistrés et le panier. Voir « Confidentialité et données » ci-dessous pour les télécharger ou les effacer.',
    'Why does the assistant only know about electronics?': 'Pourquoi l’assistant ne connaît-il que l’électronique ?', 'The catalogue has nine products: smart rings, smartwatches, earbuds and headphones. Groceries and fashion are not available yet. The product pictures are illustrative images, not official photos.': 'Le catalogue compte neuf produits : bagues connectées, montres connectées, écouteurs et casques. L’épicerie et la mode ne sont pas encore disponibles. Les images des produits sont illustratives, pas des photos officielles.',
    'How do currency and language work?': 'Comment fonctionnent la devise et la langue ?', 'Prices are stored in US dollars and converted with fixed, approximate rates (not live exchange rates). Language changes number and date formatting, and French also translates the interface text; other languages stay in English for now.': 'Les prix sont stockés en dollars américains et convertis à des taux fixes approximatifs (pas les taux de change en direct). La langue modifie le format des nombres et des dates, et le français traduit aussi le texte de l’interface ; les autres langues restent en anglais pour l’instant.',
    'How do I stop deal emails?': 'Comment arrêter les e-mails d’offres ?', 'Turn off "Email me Luxora deals and updates" under Notifications. The prototype list is opt-in only.': 'Désactivez « M’envoyer par e-mail les offres et nouveautés Luxora » dans Notifications. La liste du prototype est sur inscription uniquement.',
    'Contact us': 'Nous contacter', 'support@luxora.example (placeholder address, no mailbox yet)': 'support@luxora.example (adresse fictive, pas encore de boîte aux lettres)', 'Email support': 'Écrire au support', 'Report a bug': 'Signaler un bug', 'Opens a pre-filled email in your own mail app. Nothing is sent automatically.': 'Ouvre un e-mail prérempli dans votre application de messagerie. Rien n’est envoyé automatiquement.',
    "Luxora is a prototype AI shopping assistant. It shows real products with prices checked on Nov 3, 2026 and links to the retailer to buy. Prices can change. Luxora's own cart and checkout are a demo: no payment is taken and no order is placed. Product pictures are illustrative images, not official photos.": 'Luxora est un assistant d’achat IA prototype. Il présente des produits réels avec des prix vérifiés le 3 nov. 2026 et renvoie vers le revendeur pour acheter. Les prix peuvent changer. Le panier et le paiement de Luxora sont une démo : aucun paiement n’est prélevé et aucune commande n’est passée. Les images des produits sont illustratives, pas des photos officielles.',
    'As an Amazon Associate, Luxora earns from qualifying purchases. Links marked “Buy on Amazon” carry Luxora’s Amazon Associates tag; the price you pay is the same.': 'En tant que Partenaire Amazon, Luxora réalise un bénéfice sur les achats remplissant les conditions requises. Les liens « Acheter sur Amazon » portent l’identifiant de partenaire Amazon de Luxora ; le prix que vous payez est le même.',
    'Version': 'Version', 'Terms of use': 'Conditions d’utilisation', 'Privacy policy': 'Politique de confidentialité',
    // confirm dialogs / toasts
    'Cancel': 'Annuler', 'Clear chat history?': 'Effacer l’historique des discussions ?', 'This erases your saved conversation with the assistant on this device.': 'Cela efface votre conversation enregistrée avec l’assistant sur cet appareil.',
    'Clear saved items?': 'Effacer les articles enregistrés ?', 'All items you saved with the heart will be removed.': 'Tous les articles enregistrés avec le cœur seront retirés.', 'Clear your cart?': 'Vider votre panier ?', 'Every item will be removed from your cart.': 'Tous les articles seront retirés de votre panier.',
    'Delete your profile?': 'Supprimer votre profil ?', 'This removes your profile, settings, chat history, saved items and cart from this browser. It cannot be undone.': 'Cela supprime votre profil, vos paramètres, l’historique des discussions, les articles enregistrés et le panier de ce navigateur. Cette action est irréversible.',
    'Chat history cleared': 'Historique effacé', 'Saved items cleared': 'Articles enregistrés effacés', 'Cart cleared': 'Panier vidé', 'Profile and local data deleted': 'Profil et données locales supprimés', 'Saved': 'Enregistré',
    // shop details
    'Prices can change; always confirm at the retailer': 'Les prix peuvent changer ; confirmez toujours chez le revendeur', "Luxora's cart and checkout are a demo: no payment, no delivery": 'Le panier et le paiement de Luxora sont une démo : ni paiement, ni livraison',
    'Over-ear noise-cancelling headphones (Black). 30 hours of battery and a design that folds flat.': 'Casque supra-auriculaire à réduction de bruit (noir). 30 heures d’autonomie et un design qui se plie à plat.',
    'Titanium smart ring (Silver) for sleep, readiness and activity tracking.': 'Bague connectée en titane (argent) pour le suivi du sommeil, de la récupération et de l’activité.',
    'GPS running watch with an AMOLED display. Comes in a single 43 mm case size.': 'Montre GPS de course avec écran AMOLED. Existe en une seule taille de boîtier, 43 mm.', 'Single 43 mm case size.': 'Une seule taille de boîtier, 43 mm.',
    'Ear tip sizes are chosen when you unbox them.': 'La taille des embouts se choisit au déballage.', "Apple's current AirPods Pro. $199 at Amazon (sold by Amazon.com) versus $249 at apple.com.": 'Les AirPods Pro actuels d’Apple. 199 $ chez Amazon (vendus par Amazon.com) contre 249 $ sur apple.com.',
    'Titanium': 'Titane', 'Sleep + readiness tracking': 'Suivi du sommeil et de la récupération', 'Android / Samsung only': 'Android / Samsung uniquement',
    // sign-in / misc
    'Home': 'Accueil', 'Profile photo': 'Photo de profil',
    // dates tail
    'Buy at': 'Acheter chez'
  };
  const MONTH = { Jan: 'janv.', Feb: 'févr.', Mar: 'mars', Apr: 'avr.', May: 'mai', Jun: 'juin', Jul: 'juil.', Aug: 'août', Sep: 'sept.', Oct: 'oct.', Nov: 'nov.', Dec: 'déc.' };
  const dates = s => s.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})\b/g, (_, m, d, y) => `${d === '1' ? '1er' : d} ${MONTH[m]} ${y}`);
  const WORDS = [[/noise-cancelling headphones/, 'casque à réduction de bruit'], [/\bearbuds\b/, 'écouteurs']];
  const PATTERNS = [
    [/^(One size|Sizing kit|Size \d+) · (.+)$/, m => `${({ 'One size': 'Taille unique', 'Sizing kit': 'Kit de tailles' })[m[1]] || m[1].replace('Size', 'Taille')} · ${tr(m[2])}`],
    [/^Price checked (.+)$/, (m) => `Prix vérifié le ${m[1]}`.replace(/ · at /, ' · chez ')],
    [/^Checked (.+)$/, (m) => `Vérifié le ${m[1]}`],
    [/^From · Checked (.+)$/, (m) => `À partir de · Vérifié le ${m[1]}`],
    [/^Buy at (.+)$/, m => `Acheter chez ${m[1]}`],
    [/^Deal at (.+)$/i, m => `Offre chez ${m[1]}`],
    [/^View (.+)$/, m => `Voir ${m[1]}`], [/^Save (.+)$/, m => `Enregistrer ${m[1]}`], [/^Add (.+) to cart$/, m => `Ajouter ${m[1]} au panier`],
    [/^Remove (.+) from saved$/, m => `Retirer ${m[1]} des favoris`], [/^Saved (.+)$/, m => `${m[1]} enregistré`],
    [/^Decrease quantity of (.+)$/, m => `Diminuer la quantité de ${m[1]}`], [/^Increase quantity of (.+)$/, m => `Augmenter la quantité de ${m[1]}`],
    [/^Illustrative image of (.+) \(not an official product photo\)$/, m => `Image illustrative de ${m[1]} (ce n’est pas une photo officielle du produit)`],
    [/^Added (\d+) × (.+) to cart$/, m => `${m[1]} × ${m[2]} ajouté au panier`], [/^Choose a size for (.+) first$/, m => `Choisissez d’abord une taille pour ${m[1]}`], [/^Moved (.+) to cart$/, m => `${m[1]} déplacé dans le panier`],
    [/^Moved (\d+) items? to .*$/, m => `${m[1]} article${m[1] === '1' ? '' : 's'} déplacé${m[1] === '1' ? '' : 's'} dans le panier`],
    [/^(\d+) products?$/, m => `${m[1]} produit${m[1] === '1' ? '' : 's'}`], [/^(\d+) items? saved$/, m => `${m[1]} article${m[1] === '1' ? '' : 's'} enregistré${m[1] === '1' ? '' : 's'}`],
    [/^(\d+) items? in your cart$/, m => `${m[1]} article${m[1] === '1' ? '' : 's'} dans votre panier`], [/^(\d+) messages? saved$/, m => `${m[1]} message${m[1] === '1' ? '' : 's'} enregistré${m[1] === '1' ? '' : 's'}`],
    [/^Ends today$/, () => 'Se termine aujourd’hui'], [/^Ends (.+) \((\d+) days? left\)$/, m => `Se termine le ${m[1]} (${m[2]} jours restants)`],
    [/^Compared with (.+)\.$/, m => `Comparé à : ${m[1]}.`], [/^Also at (.+)$/, m => `Aussi chez ${m[1]}`],
    [/^Hi, (.+)$/, m => `Bonjour, ${m[1]}`], [/^Attached: (.+)$/, m => `Joint : ${m[1]}`],
    [/^Shipping region: (.+) \(shipping is set by the retailer\)\. Prices shown in (.+)\.$/, m => `Région de livraison : ${({ 'the United States': 'les États-Unis', 'Canada': 'le Canada', 'the United Kingdom': 'le Royaume-Uni', 'India': 'l’Inde', 'Germany': 'l’Allemagne', 'France': 'la France', 'Spain': 'l’Espagne', 'Australia': 'l’Australie' })[m[1]] || m[1]} (la livraison dépend du revendeur). Prix affichés en ${m[2].replace(' at approximate rates, not live exchange rates', ' à des taux approximatifs, pas les taux de change en direct')}.`],
    [/^Luxora doesn't sell this\. The button opens (.+) in a new tab, where you buy and where shipping, returns and warranty are handled\. The cart below is a demo\.$/, m => `Luxora ne vend pas ce produit. Le bouton ouvre ${m[1]} dans un nouvel onglet, où vous achetez et où la livraison, les retours et la garantie sont gérés. Le panier ci-dessous est une démo.`],
    [/^Real shipping, returns and warranty come from (.+)$/, m => `La livraison, les retours et la garantie réels dépendent de ${m[1]}`],
    [/^Price checked (.+)\. (.+) for (\$[\d.,]+) at (.+?), (.+) below (.+?)['’]s (?:original )?(\$[\d.,]+)(?: price)?$/, null],
    [/^Amazon's price and availability can differ from the price shown here\.$/, () => 'Le prix et la disponibilité sur Amazon peuvent différer du prix affiché ici.'],
    [/^(.+) for (\$[\d.,]+) at ([^,]+), (\$?[\d.,]+%?) below (.+?)['’]s (original )?(\$[\d.,]+)( price)?$/, m => {
      let name = m[1]; WORDS.forEach(([re, to]) => { name = name.replace(re, to); });
      const orig = m[6] ? 'prix d’origine' : 'prix', de = /^[AEIOUH]/i.test(m[5]) ? `d’${m[5]}` : `de ${m[5]}`; const fm = x => x.replace(/\$(\d[\d,]*)(?:\.(\d\d))?/g, (_, a, c) => `${a.replace(/,/g, ' ')}${c ? ',' + c : ''} $US`); return fm(`${name} à ${m[2]} chez ${m[3]}, ${m[4]} de moins que le ${orig} ${de} (${m[7]})`); }],
    [/^Compared with (.+)$/, m => `Comparé à : ${m[1]}`]
  ].filter(p => p[1]);
  const SUFFIX = { ' · at ': ' · chez ' };

  function tr(src) {
    const lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0], core = src.trim(); if (!core) return src;
    let out = FR[core];
    if (out == null) {
      for (const [re, f] of PATTERNS) { const m = core.match(re); if (m) { out = f(m); break; } }
    }
    if (out == null) return src;
    return lead + dates(out).replace(' · at ', ' · chez ') + trail;
  }
  // "Price checked Nov 3, 2026. Sony WH-1000XM5 ... " (deal note) = two sentences: translate each
  const full = src => { const core = src.trim(); const m = core.match(/^(Price checked [A-Z][a-z]{2} \d{1,2}, \d{4})\. (.+)$/); if (m && FR[core] == null) { const a = tr(m[1]), b = tr(m[2]); if (a !== m[1] || b !== m[2]) return src.replace(core, `${a}. ${b}`); } return tr(src); };

  let lang = 'en', busy = false;
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const skip = n => { const p = n.parentNode; return !p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE)$/.test(p.nodeName) || (p.closest && p.closest('.msg--user, [data-no-i18n]')); };
  function doText(n) {
    if (skip(n)) return;
    if (lang !== 'fr') { if (n.__fr != null && n.nodeValue === n.__fr) { n.nodeValue = n.__en; } n.__fr = n.__en = undefined; return; }
    const cur = n.nodeValue, orig = n.__fr != null && cur === n.__fr ? n.__en : cur, out = full(orig);
    if (out !== orig) { n.__en = orig; n.__fr = out; if (cur !== out) n.nodeValue = out; } else { n.__en = n.__fr = undefined; }
  }
  function doAttrs(el) {
    if (!el.getAttribute || (el.closest && el.closest('.msg--user, [data-no-i18n]'))) return;
    const st = el.__i18n || (el.__i18n = {});
    for (const a of ATTRS) {
      const cur = el.getAttribute(a); if (cur == null) continue; const rec = st[a];
      if (lang !== 'fr') { if (rec && cur === rec.fr) el.setAttribute(a, rec.en); st[a] = undefined; continue; }
      const orig = rec && cur === rec.fr ? rec.en : cur, out = full(orig);
      if (out !== orig) { st[a] = { en: orig, fr: out }; if (cur !== out) el.setAttribute(a, out); } else st[a] = undefined;
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }
  function title() { const d = document; if (lang === 'fr') { if (d.__t == null || d.title !== d.__tfr) d.__t = d.title; const o = full(d.__t); d.__tfr = o; if (d.title !== o) d.title = o; } else if (d.__t != null && d.title === d.__tfr) { d.title = d.__t; d.__t = null; } }
  function run(root) { busy = true; try { walk(root || document.body); title(); } finally { busy = false; } }
  let pending = false; const queue = new Set();
  function flush() { pending = false; busy = true; try { queue.forEach(n => { if (n.isConnected !== false) walk(n); }); } finally { queue.clear(); busy = false; } }
  const obs = new MutationObserver(list => {
    if (busy) return;
    for (const m of list) {
      if (m.type === 'characterData') { if (m.target.nodeValue !== m.target.__fr) queue.add(m.target); }
      else if (m.type === 'attributes') queue.add(m.target);
      else m.addedNodes.forEach(n => queue.add(n));
    }
    if (queue.size && !pending) { pending = true; (window.requestAnimationFrame || setTimeout)(flush); }
  });
  function set(l) { const next = /^fr/i.test(l || '') ? 'fr' : 'en'; if (next === lang && document.__i18nInit) return; lang = next; document.__i18nInit = true; run(); }
  const api = window.LuxoraI18n = { t: s => (lang === 'fr' ? full(s) : s), lang: () => lang, apply: () => run() };
  function boot() {
    set(window.LuxoraPrefs ? window.LuxoraPrefs.get().language : 'en-US');
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.addEventListener('luxora:prefs', e => set((e.detail || window.LuxoraPrefs.get()).language));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
