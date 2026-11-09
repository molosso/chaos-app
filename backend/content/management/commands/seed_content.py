from django.core.management.base import BaseCommand

from content.models import Atelier, Category, ContentItem, ImprovScene, Workshop

ELOQUENCE_TOPICS = [
    "Les pigeons devraient diriger l'université.",
    "Il faut remplacer les examens par des duels de mimes.",
    "Le café froid est supérieur au café chaud.",
    "Les chaussettes dépareillées devraient être obligatoires.",
    "Les robots devraient corriger les copies à la place des professeurs.",
    "Il est temps d'interdire les ascenseurs silencieux.",
    "Les chats devraient voter aux élections municipales.",
    "La sieste doit devenir une matière scolaire.",
    "Les parapluies sont une invention ratée.",
    "Il faut donner un jour férié en l'honneur des lundis.",
]

ELOQUENCE_WORDS = [
    "pizza", "fusée", "chat", "parapluie", "trottinette", "sandwich",
    "fantôme", "aspirateur", "cactus", "karaoké", "boussole", "yaourt",
]

STORY_CHARACTERS = [
    "une étudiante insomniaque", "un facteur superstitieux", "une grand-mère pilote de course",
    "un robot de cantine", "une journaliste allergique aux nouvelles", "un chat qui déteste le silence",
]
STORY_PLACES = [
    "un désert", "un ascenseur bloqué", "une bibliothèque fermée depuis 1998",
    "une station de métro fantôme", "un marché aux poissons désert",
]
STORY_OBJECTS = [
    "un téléphone qui ne sonne qu'en retard", "une clé qui n'ouvre aucune porte connue",
    "un carnet dont les pages se réécrivent seules", "une horloge qui avance à reculons",
]
STORY_GRAMMAR = [
    "le passé composé", "l'imparfait", "le futur simple", "le conditionnel", "le subjonctif présent",
]
STORY_BANS = ["mais", "très", "chose", "bien", "alors"]

MEME_SITUATIONS = [
    "avant un examen", "en réunion de groupe à 23h la veille du rendu",
    "quand le professeur dit que le contrôle sera facile",
    "le premier jour de cours après les vacances",
    "quand quelqu'un lit par-dessus ton épaule",
]

FAKE_NEWS_TOPICS = [
    "Un chat est élu maire d'une petite ville.",
    "Une école remplace les notes par des concours de grimaces.",
    "Un distributeur de café se met à parler en alexandrins.",
    "Une ville entière décide de ne communiquer que par chansons.",
]

IMAGE_PROMPTS = [
    "Imagine ce qui s'est passé juste avant cette image.",
    "Imagine ce que la personne ou l'objet au centre de l'image pense en ce moment.",
    "Imagine ce qui se passe juste après cette image.",
    "Raconte cette scène du point de vue d'un témoin caché.",
]

IMPROV_SCENES = [
    ("un vendeur très maladroit", "vendre une machine dont personne ne connaît l'usage", "faire rire le public sans jamais expliquer clairement l'objet"),
    ("un guide touristique qui a perdu son groupe", "improviser une visite dans un endroit qu'il ne connaît pas", "garder son sérieux devant l'absurdité de la situation"),
    ("un chef étoilé", "cuisiner avec les seuls ingrédients trouvés dans un tiroir de bureau", "convaincre un client difficile"),
    ("un détective très distrait", "résoudre une enquête alors qu'il a oublié l'indice principal", "garder l'air compétent"),
]


class Command(BaseCommand):
    help = "Remplit la base avec le contenu pédagogique original des sept ateliers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Ne rien faire si du contenu existe déjà (évite de recréer ce que l'admin a supprimé).",
        )

    def handle(self, *args, **options):
        if options["if_empty"]:
            self.create_workshops()
            if ContentItem.objects.exists() or ImprovScene.objects.exists():
                self.stdout.write("Contenu déjà présent, aucune banque n'a été recréée.")
                return

        def bulk(atelier, category, texts):
            created = 0
            for text in texts:
                _, was_created = ContentItem.objects.get_or_create(
                    atelier=atelier, category=category, text=text
                )
                created += int(was_created)
            return created

        total = 0
        total += bulk(Atelier.ELOQUENCE, Category.TOPIC, ELOQUENCE_TOPICS)
        total += bulk(Atelier.ELOQUENCE, Category.WORD, ELOQUENCE_WORDS)
        total += bulk(Atelier.HISTOIRES, Category.CHARACTER, STORY_CHARACTERS)
        total += bulk(Atelier.HISTOIRES, Category.PLACE, STORY_PLACES)
        total += bulk(Atelier.HISTOIRES, Category.OBJECT, STORY_OBJECTS)
        total += bulk(Atelier.HISTOIRES, Category.GRAMMAR, STORY_GRAMMAR)
        total += bulk(Atelier.HISTOIRES, Category.BAN, STORY_BANS)
        total += bulk(Atelier.MEMES, Category.SITUATION, MEME_SITUATIONS)
        total += bulk(Atelier.FAKE_NEWS, Category.TOPIC, FAKE_NEWS_TOPICS)
        total += bulk(Atelier.IMAGE_HISTOIRE, Category.PROMPT, IMAGE_PROMPTS)

        scenes_created = 0
        for character, situation, goal in IMPROV_SCENES:
            _, was_created = ImprovScene.objects.get_or_create(
                character=character, situation=situation, goal=goal
            )
            scenes_created += int(was_created)

        workshops_created = self.create_workshops()

        self.stdout.write(self.style.SUCCESS(
            f"{total} entrées de contenu, {scenes_created} scènes et {workshops_created} ateliers créés."
        ))

    @staticmethod
    def create_workshops():
        created = 0
        for atelier, title in Atelier.choices:
            if not Workshop.objects.filter(atelier=atelier).exists():
                Workshop.objects.create(
                    atelier=atelier, title=title,
                    description=f"Activité pédagogique : {title}.",
                )
                created += 1
        return created
