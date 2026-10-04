/* =========================================================
   data.js — default routine and schedule data.
   Loaded with a plain <script> tag before app.js, so these
   constants are available globally. The app copies
   DEFAULT_ROUTINES into saved data on first run; edit them
   in the app, or here to change the "Reset to defaults" copy.
   ========================================================= */

const DEFAULT_SCHEDULE = [
  { day: 1, routineId: "upper" },
  { day: 2, routineId: "lower" },
  { day: 3, routineId: "active-rest" },
  { day: 4, routineId: "upper" },
  { day: 5, routineId: "lower" },
  { day: 6, routineId: "active-rest" },
  { day: 7, routineId: "rest" }
];
// Day 1 maps to settings.scheduleStartWeekday (default Monday).
// The morning routine is done every day, including Rest days.

const PAIN_RULE = "Keep pain at 3/10 or lower during exercises, and make sure you're back to baseline by the next morning. If not, cut volume or load next session.";

const PROGRESSIONS = [
  "Hamstring bridge: both heels with knees bent → both heels with knees nearly straight → single leg. Move up when the current level feels easy and normal for 3 x 30s; drop back if you cramp or feel a pull near the old injury.",
  "Once tempo RDLs and eccentric curls feel completely normal, add band-assisted Nordics (1x/week, 3 x 3–5).",
  "After that, add Phase A plyometrics: pogo hops, ankle hops, snap-downs, box jumps (step down), lateral line hops; ~30–40 contacts, 2x/week, before lifting."
];

const DEFAULT_ROUTINES = [
  {
    id: "morning",
    name: "Morning",
    when: "Daily",
    sections: [
      {
        title: "Lymphatic flow",
        items: [
          { name: "Arm circles", type: "reps", dose: "", cue: "" },
          { name: "Bodyweight squats and lunges", type: "reps", dose: "", cue: "" },
          { name: "Body waves", type: "reps", dose: "", cue: "" },
          { name: "Light hops", type: "reps", dose: "", cue: "" },
          { name: "Arm movement variations", type: "reps", dose: "", cue: "" }
        ]
      },
      {
        title: "Dynamic stretching",
        items: [
          { name: "Cat-cow", type: "reps", dose: "x8", cue: "On hands and knees, round your spine up, then let it sag while lifting your chest. Move slowly with your breath." },
          { name: "90/90 hip switches", type: "reps", dose: "x8/side", cue: "Sit with both knees bent at 90°, one leg in front and one to the side. Rotate your knees to the other side; lean over the front shin on the last few reps." },
          { name: "World's greatest stretch", type: "reps", dose: "x5/side", cue: "Deep lunge, same-side hand on the floor inside your front foot. Drop that elbow toward the ankle, then rotate open and reach to the ceiling." },
          { name: "Open books", type: "reps", dose: "x6/side", cue: "Side-lying, knees bent at 90° and stacked, arms out front. Sweep the top arm over to the other side, eyes following your hand." },
          { name: "Butterfly rocks", type: "reps", dose: "x10", cue: "Soles of the feet together, hold your ankles. Hinge forward with a flat back, then come back up." },
          { name: "Deep squat hold", type: "hold", dose: "60s", holdSeconds: 60, sets: 1, cue: "Sit to the bottom of a squat, holding a post if needed. Shift side to side and push your knees out with your elbows." },
          { name: "Knee-to-toe ankle rocks", type: "reps", dose: "x10/side", cue: "Half-kneeling, drive your front knee forward past your toes with your heel down. Pause briefly at the end." },
          { name: "Leg swings", type: "reps", dose: "x10 each direction/leg", cue: "Hold a wall. Swing front to back, then side to side across your body. Start small and build range." }
        ]
      }
    ]
  },
  {
    id: "upper",
    name: "Upper",
    when: "Days 1 and 4",
    sections: [
      {
        title: "Band openers",
        items: [
          { name: "Band front pulls", type: "reps", dose: "", cue: "Pull the band toward your face with elbows high, squeezing your shoulder blades together." },
          { name: "Band around the worlds", type: "reps", dose: "", cue: "Hold a band wide with straight arms and bring it from your hips, over your head, to behind your back and back again. Start wide." },
          { name: "Band rotations up and down", type: "reps", dose: "", cue: "Elbow at shoulder height and bent 90°; rotate the forearm up and down against the band." }
        ]
      },
      {
        title: "Lifts",
        items: [
          { name: "Lat pulldowns", type: "lift", dose: "", cue: "" },
          { name: "Seated rows", type: "lift", dose: "", cue: "" },
          { name: "Push-ups", type: "lift", dose: "", cue: "Only push movement for now while the shoulder recovers." },
          { name: "Lateral raises", type: "lift", dose: "", cue: "" },
          { name: "Trap/scapula raises", type: "lift", dose: "", cue: "" },
          { name: "Biceps", type: "lift", dose: "", cue: "" },
          { name: "Triceps (cable)", type: "lift", dose: "", cue: "" }
        ]
      },
      {
        title: "Band finisher",
        items: [
          { name: "Band external rotations", type: "hold", dose: "sets + 30–45s hold at end of last set", holdSeconds: 45, sets: 1, cue: "Elbow pinned to your side, bent 90°. Rotate out against the band; on the last set, hold at the end of the range." },
          { name: "Band internal rotations", type: "hold", dose: "sets + 30–45s hold at end of last set", holdSeconds: 45, sets: 1, cue: "Same setup, facing the other way. Rotate in across your body; hold at the end of the last set." }
        ]
      }
    ]
  },
  {
    id: "lower",
    name: "Lower",
    when: "Days 2 and 5",
    notes: "If the knee is cranky before squatting, do 1–2 wall sits first.",
    sections: [
      {
        title: "Lifts",
        items: [
          { name: "Front squats", type: "lift", dose: "", cue: "" },
          { name: "Leg extensions (heavy)", type: "lift", dose: "", cue: "" },
          { name: "Prone hamstring curls", type: "lift", dose: "light, eccentric focus", cue: "Lift normally, take 3+ seconds to lower." },
          { name: "Tempo RDLs", type: "lift", dose: "light, 3s lowering", cue: "Flat back, soft knee. Lower over 3 seconds, stop when the hamstrings are on stretch, stand normally." },
          { name: "Back extensions", type: "lift", dose: "bodyweight or light", cue: "" },
          { name: "Abductor machine", type: "lift", dose: "", cue: "" },
          { name: "Adductor machine", type: "lift", dose: "", cue: "" },
          { name: "Calf raises", type: "lift", dose: "", cue: "" }
        ]
      },
      {
        title: "Iso block",
        items: [
          { name: "Wall sit", type: "hold", dose: "4 x 45s", holdSeconds: 45, sets: 4, cue: "Back flat against the wall, knees bent about 60–70°. Rest 1–2 min between sets." },
          { name: "Static lunge", type: "hold", dose: "3 x 30–45s/side", holdSeconds: 45, sets: 3, perSide: true, cue: "Split squat with the back knee hovering an inch off the floor. Torso tall, front heel planted." },
          { name: "Hamstring bridge hold, heel on bench", type: "hold", dose: "3 x 30s", holdSeconds: 30, sets: 3, cue: "Heels on a bench, lift your hips and hold. Progress: both heels knees bent → both heels knees nearly straight → single leg." },
          { name: "Heel dig iso", type: "hold", dose: "2 x 20–30s at 2–3 knee angles", holdSeconds: 30, sets: 2, cue: "On your back, knee bent. Dig your heel into the floor and pull toward your butt without moving. Repeat at different knee angles." },
          { name: "Static calf raise, straight knee", type: "hold", dose: "3 x 30–45s/side", holdSeconds: 45, sets: 3, perSide: true, cue: "One foot on a step edge, rise to the top, lower halfway, hold." },
          { name: "Static calf raise, bent knee", type: "hold", dose: "2 x 30s/side", holdSeconds: 30, sets: 2, perSide: true, cue: "Same hold with the knee bent about 30°. Targets the soleus." },
          { name: "Tibialis raises", type: "reps", dose: "2 x 15–20", cue: "Back against a wall, heels about a foot out. Pull your toes up toward your shins, lower slowly." },
          { name: "Copenhagen plank", type: "hold", dose: "3 x 15–30s/side", holdSeconds: 30, sets: 3, perSide: true, cue: "Side plank with your top knee on a bench and the bottom leg hanging free. Lift your hips and hold." }
        ]
      }
    ]
  },
  {
    id: "active-rest",
    name: "Active Rest",
    when: "Days 3 and 6 (home)",
    sections: [
      {
        title: "Cardio",
        items: [
          { name: "StairMaster", type: "time", dose: "25 min, easy pace", holdSeconds: 1500, cue: "Conversational pace." }
        ]
      },
      {
        title: "Soft tissue and stretching",
        items: [
          { name: "Ball under each foot", type: "time", dose: "1 min/side", holdSeconds: 60, perSide: true, cue: "Roll slowly from heel to toes, pausing on tight spots." },
          { name: "Foam roll calves, quads, adductors; hamstrings lightly", type: "reps", dose: "", cue: "Stay off the injured hamstring spot." },
          { name: "Couch stretch", type: "hold", dose: "60s/side", holdSeconds: 60, sets: 1, perSide: true, cue: "Back knee against a wall or couch with the shin running up it, other foot forward. Squeeze the back glute." },
          { name: "Pigeon", type: "hold", dose: "60s/side", holdSeconds: 60, sets: 1, perSide: true, cue: "From a push-up position, bring one knee behind the same-side wrist, shin angled across. Back leg straight, hips square, fold forward." },
          { name: "Child's pose with lat reach", type: "hold", dose: "30s center + 30s each side", holdSeconds: 30, sets: 3, cue: "Knees wide, sit back on your heels, arms out front. Walk your hands to one side to stretch the opposite lat." },
          { name: "Foam roller thoracic extension", type: "time", dose: "1 min", holdSeconds: 60, cue: "Roller across the upper back, hands behind your head. Extend back over it, moving the roller up a few inches at a time." },
          { name: "Lat stretch", type: "hold", dose: "2 x 30s/side", holdSeconds: 30, sets: 2, perSide: true, cue: "Grab a doorframe at about head height and sit your hips back and away." },
          { name: "Wall slides", type: "reps", dose: "2 x 10", cue: "Back, head and forearms on the wall. Slide your arms up only as far as you can keep contact, then back down." }
        ]
      }
    ]
  },
  {
    id: "rest",
    name: "Rest",
    when: "Day 7",
    sections: [
      { title: "Rest", items: [{ name: "Full rest. Morning routine only.", type: "info", dose: "", cue: "" }] }
    ]
  }
];
