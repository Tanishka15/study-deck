import os
import cv2
import mediapipe as mp
import time
import numpy as np
import math
import logging
import warnings
from collections import deque
from enum import Enum

# Suppress TensorFlow and MediaPipe warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow logging
warnings.filterwarnings('ignore', category=UserWarning)  # Suppress UserWarnings
logging.getLogger('mediapipe').setLevel(logging.ERROR)  # Only show ERROR messages from mediapipe

# Application title and version
APP_TITLE = "Virtual Painter Pro"
APP_VERSION = "1.0"

# we have these functions instead of hand module
mpHands = mp.solutions.hands
# Lowering detection and tracking confidence for better responsiveness
hands = mpHands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)
mpdraw = mp.solutions.drawing_utils
draw_color = (139, 0, 0)
brush_thickness = 14
brush_sizes = [8, 14, 20]  # Small, Medium, Large
current_size_idx = 1  # Medium by default

# Add smoothing for hand tracking
smoothing_factor = 0.5  # Adjust between 0 and 1 (higher = more smoothing)
previous_landmarks = None  # To store previous hand positions
last_index_pos = None  # To store last known index fingertip position
# Debounce/hysteresis for shape toggle (pinky)
previous_fingers = [0, 0, 0, 0, 0]
last_shape_toggle_time = 0.0
SHAPE_TOGGLE_DEBOUNCE = 0.5  # seconds

# Symmetry mode toggle
last_symmetry_toggle_time = 0.0
SYMMETRY_TOGGLE_DEBOUNCE = 0.5  # seconds

# UI Color Constants
COLOR_BLUE = (250, 0, 0)       # BGR format (Blue)
COLOR_YELLOW = (153, 255, 255) # BGR format (Yellow)
COLOR_RED = (52, 66, 227)      # BGR format (Red)
COLOR_GREEN = (60, 179, 113)   # BGR format (Green)
COLOR_BLACK = (0, 0, 0)        # Black (Eraser)

# Undo/Redo functionality
MAX_HISTORY = 20
undo_stack = deque(maxlen=MAX_HISTORY)  # For undo operations
redo_stack = deque(maxlen=MAX_HISTORY)  # For redo operations
current_stroke = []  # To store points of the current stroke

# Shape drawing modes
class ShapeMode(Enum):
    FREEHAND = 0
    LINE = 1
    RECTANGLE = 2
    CIRCLE = 3

current_shape_mode = ShapeMode.FREEHAND
shape_start_point = None

# Symmetry modes
class SymmetryMode(Enum):
    NONE = 0
    HORIZONTAL = 1
    VERTICAL = 2
    BOTH = 3
    RADIAL_4 = 4

current_symmetry_mode = SymmetryMode.NONE

# Tool modes
class ToolMode(Enum):
    DRAW = 0
    FILL = 1
    EYEDROPPER = 2

current_tool_mode = ToolMode.DRAW

# Save counter for filenames
save_counter = 0


def findhands(img, draw):
    imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands.process(imgRGB)
    if results.multi_hand_landmarks:
        for handslm in results.multi_hand_landmarks:
            if draw:
                mpdraw.draw_landmarks(img, handslm,
                                      mpHands.HAND_CONNECTIONS)
    return img, results


def position(img, results, handno=0, draw=True):
    global previous_landmarks
    landmark_list = []
    
    if results.multi_hand_landmarks:
        myhand = results.multi_hand_landmarks[handno]
        
        # Create temporary list of current hand landmarks
        current_landmarks = []
        for id, lm in enumerate(myhand.landmark):
            height, width, channels = img.shape
            xcoord, ycoord = int(lm.x * width), int(lm.y * height)
            current_landmarks.append([id, xcoord, ycoord])
        
        # Apply smoothing if previous landmarks exist
        if previous_landmarks is not None and len(previous_landmarks) == len(current_landmarks):
            for i, landmark in enumerate(current_landmarks):
                id, x, y = landmark
                prev_x = previous_landmarks[i][1]
                prev_y = previous_landmarks[i][2]
                
                # Smooth the coordinates
                smoothed_x = int(prev_x * smoothing_factor + x * (1 - smoothing_factor))
                smoothed_y = int(prev_y * smoothing_factor + y * (1 - smoothing_factor))
                
                landmark_list.append([id, smoothed_x, smoothed_y])
                
                # Draw the index fingertip with smoother motion
                if draw and id == 8:
                    cv2.circle(img, (smoothed_x, smoothed_y), 12, draw_color, cv2.FILLED)
        else:
            # If no previous landmarks, use current ones
            landmark_list = current_landmarks
            
            # Draw the index fingertip
            if draw:
                for id, x, y in landmark_list:
                    if id == 8:  # Index fingertip
                        cv2.circle(img, (x, y), 12, draw_color, cv2.FILLED)
        
        # Save current landmarks for next frame
        previous_landmarks = landmark_list.copy()
    else:
        # If no hand detected, reset previous landmarks
        previous_landmarks = None
        
    return landmark_list

def calculate_distance(pt1, pt2):
    return math.sqrt((pt2[0] - pt1[0])**2 + (pt2[1] - pt1[1])**2)

def dynamic_brush_thickness(thumb_pos, index_pos):
    distance = calculate_distance([thumb_pos[1], thumb_pos[2]], [index_pos[1], index_pos[2]])
    # Map distance to thickness (min: 5, max: 30)
    min_distance = 20  # Minimum expected distance in pixels
    max_distance = 200  # Maximum expected distance in pixels
    min_thickness = 5
    max_thickness = 30
    
    if distance < min_distance:
        return min_thickness
    if distance > max_distance:
        return max_thickness
    
    # Linear mapping from distance to thickness
    thickness = min_thickness + (distance - min_distance) * (max_thickness - min_thickness) / (max_distance - min_distance)
    return int(thickness)

def create_sidebar(img, draw_color, brush_thickness, shape_mode, undo_count, redo_count):
    """Create a clean sidebar with current settings and status"""
    h, w = img.shape[:2]
    
    # Create sidebar on the right side
    sidebar_width = 200
    sidebar_color = (245, 245, 245)  # Light gray
    
    # Create the sidebar background
    sidebar = np.ones((h, sidebar_width, 3), dtype=np.uint8) * np.array(sidebar_color, dtype=np.uint8)
    
    # Add gradient effect
    for x in range(sidebar_width):
        alpha = x / sidebar_width * 0.15
        sidebar[:, x] = sidebar[:, x] * (1 - alpha) + np.array([230, 230, 230], dtype=np.uint8) * alpha
    
    # Add vertical separator line
    cv2.line(sidebar, (0, 0), (0, h), (200, 200, 200), 3)
    
    # Add title with icon
    cv2.rectangle(sidebar, (0, 0), (sidebar_width, 45), (70, 70, 70), cv2.FILLED)
    cv2.putText(sidebar, "CONTROLS", (35, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
    
    y_pos = 65
    
    # Current Tool section
    cv2.putText(sidebar, "Active Tool", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
    y_pos += 25
    
    tool_names = ["DRAW", "FILL", "PICKER"]
    tool_color = (100, 150, 255) if current_tool_mode == ToolMode.DRAW else \
                 (255, 150, 100) if current_tool_mode == ToolMode.FILL else (150, 255, 150)
    
    cv2.rectangle(sidebar, (15, y_pos-20), (185, y_pos+10), tool_color, cv2.FILLED)
    cv2.putText(sidebar, tool_names[current_tool_mode.value], (55, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
    
    y_pos += 35
    
    # Current color section
    cv2.putText(sidebar, "Current Color", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 10
    
    # Draw color preview - larger
    color_y = y_pos + 20
    cv2.rectangle(sidebar, (15, color_y-25), (185, color_y+25), 
                  (150, 150, 150), cv2.FILLED)  # Shadow
    cv2.rectangle(sidebar, (17, color_y-23), (183, color_y+23), 
                  draw_color, cv2.FILLED)  # Color
    cv2.rectangle(sidebar, (17, color_y-23), (183, color_y+23), 
                  (100, 100, 100), 2)  # Border
    
    # Is it eraser?
    if draw_color == (0, 0, 0):
        cv2.putText(sidebar, "ERASER", (65, color_y+5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    
    y_pos = color_y + 50
    
    # Brush size section
    cv2.putText(sidebar, "Brush Size", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 30
    
    # Draw brush size preview
    brush_y = y_pos
    cv2.circle(sidebar, (100, brush_y), min(brush_thickness//2 + 2, 35), 
               (150, 150, 150), cv2.FILLED)
    cv2.circle(sidebar, (100, brush_y), min(brush_thickness//2, 33), 
               (50, 50, 50), cv2.FILLED)
    cv2.putText(sidebar, f"{brush_thickness} px", (70, brush_y+50), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
    
    y_pos = brush_y + 70
    
    # Shape mode section
    cv2.putText(sidebar, "Shape Mode", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 10
    
    shape_mode_names = ["Freehand", "Line", "Rect", "Circle"]
    shape_y = y_pos + 20
    
    cv2.rectangle(sidebar, (15, shape_y-15), (185, shape_y+15), 
                  (220, 235, 220), cv2.FILLED)
    cv2.rectangle(sidebar, (15, shape_y-15), (185, shape_y+15), 
                  (150, 200, 150), 2)
    
    cv2.putText(sidebar, shape_mode_names[shape_mode.value], (45, shape_y+5), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 100, 40), 2)
    
    y_pos = shape_y + 35
    
    # Symmetry mode section
    cv2.putText(sidebar, "Symmetry", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 10
    
    sym_names = ["None", "H-Mirror", "V-Mirror", "Both", "Radial-4"]
    sym_y = y_pos + 20
    sym_color = (200, 220, 255) if current_symmetry_mode != SymmetryMode.NONE else (230, 230, 230)
    
    cv2.rectangle(sidebar, (15, sym_y-15), (185, sym_y+15), 
                  sym_color, cv2.FILLED)
    cv2.rectangle(sidebar, (15, sym_y-15), (185, sym_y+15), 
                  (150, 150, 180), 2)
    
    cv2.putText(sidebar, sym_names[current_symmetry_mode.value], (35, sym_y+5), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 40, 100), 1)
    
    y_pos = sym_y + 40
    
    # History section
    cv2.putText(sidebar, "History", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 20
    
    cv2.putText(sidebar, f"Undo: {len(undo_stack)}", (20, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 60, 60), 1)
    y_pos += 20
    cv2.putText(sidebar, f"Redo: {len(redo_stack)}", (20, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 60, 60), 1)
    
    y_pos += 30
    
    # Keyboard shortcuts
    cv2.putText(sidebar, "Keys", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 20
    
    shortcuts = [
        "S - Save PNG",
        "C - Clear All",
        "+/- Smoothing",
        "Q - Quit"
    ]
    
    for shortcut in shortcuts:
        cv2.putText(sidebar, shortcut, (20, y_pos), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 80, 80), 1)
        y_pos += 18
    
    # Gesture help
    y_pos += 10
    cv2.putText(sidebar, "Gestures", (15, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)
    y_pos += 20
    
    gestures = [
        "Pinky - Shapes",
        "Palm (5) - Sym"
    ]
    
    for gesture in gestures:
        cv2.putText(sidebar, gesture, (20, y_pos), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 80, 80), 1)
        y_pos += 18
    
    # Show current smoothing
    y_pos += 5
    cv2.putText(sidebar, f"Smooth: {smoothing_factor:.2f}", (20, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)
    
    return sidebar

def count_fingers_up(lmList):
    """Count how many fingers are up"""
    if len(lmList) < 21:  # Need all finger landmarks
        # Return an empty list and zero so callers can unpack safely
        return [], 0
    
    fingers = []
    # Thumb (special case)
    if lmList[4][1] < lmList[3][1]:  # For right hand
        fingers.append(1)
    else:
        fingers.append(0)
    
    # Other 4 fingers
    for id in [8, 12, 16, 20]:  # Index, middle, ring, pinky fingertips
        if lmList[id][2] < lmList[id-2][2]:  # If fingertip is higher than second joint
            fingers.append(1)
        else:
            fingers.append(0)
    
    return fingers, sum(fingers)

def save_stroke(canvas):
    """Save the current canvas state to undo stack"""
    undo_stack.append(canvas.copy())
    # Clear redo stack when new action is performed
    redo_stack.clear()

def undo_action(canvas):
    """Undo the last action"""
    if undo_stack:
        # Save current state to redo stack
        redo_stack.append(canvas.copy())
        # Restore previous state
        return undo_stack.pop()
    return canvas

def redo_action(canvas):
    """Redo the last undone action"""
    if redo_stack:
        # Save current state to undo stack
        undo_stack.append(canvas.copy())
        # Restore next state
        return redo_stack.pop()
    return canvas

def draw_shape(img, canvas, shape_mode, start_point, end_point, color, thickness):
    """Draw different shapes based on the shape mode"""
    shape_canvas = canvas.copy()
    
    if shape_mode == ShapeMode.LINE:
        cv2.line(img, start_point, end_point, color, thickness)
        cv2.line(shape_canvas, start_point, end_point, color, thickness)
    
    elif shape_mode == ShapeMode.RECTANGLE:
        cv2.rectangle(img, start_point, end_point, color, thickness)
        cv2.rectangle(shape_canvas, start_point, end_point, color, thickness)
    
    elif shape_mode == ShapeMode.CIRCLE:
        # Calculate radius from the distance between points
        radius = int(math.sqrt((end_point[0] - start_point[0])**2 + (end_point[1] - start_point[1])**2))
        cv2.circle(img, start_point, radius, color, thickness)
        cv2.circle(shape_canvas, start_point, radius, color, thickness)
    
    return shape_canvas

def display_info_overlay(img, info_text, position, is_alert=False, timeout=None):
    """Display information overlay with nice styling
    
    Args:
        img: Image to overlay on
        info_text: Text to display
        position: Position type ('top', 'bottom', or (x, y))
        is_alert: Whether this is an alert message (different styling)
        timeout: Optional timeout in seconds (None for persistent)
    """
    h, w = img.shape[:2]
    
    if position == 'top':
        y_pos = 150  # Below header
        x_pos = 20
    elif position == 'bottom':
        y_pos = h - 50
        x_pos = 20
    else:
        x_pos, y_pos = position
    
    # Define styling based on message type
    if is_alert:
        bg_color = (40, 40, 200)  # Red background for alerts
        text_color = (255, 255, 255)  # White text
        alpha = 0.8
    else:
        bg_color = (50, 50, 50)  # Dark background
        text_color = (255, 255, 255)  # White text
        alpha = 0.6
    
    # Measure text size
    (text_width, text_height), baseline = cv2.getTextSize(
        info_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
    
    # Calculate background rectangle dimensions with padding
    padding = 10
    rect_width = text_width + 2 * padding
    rect_height = text_height + 2 * padding
    
    # Create overlay for semi-transparency
    overlay = img.copy()
    
    # Draw rounded rectangle background
    cv2.rectangle(overlay, (x_pos, y_pos - text_height - padding), 
                  (x_pos + rect_width, y_pos + padding), bg_color, cv2.FILLED)
    
    # Add text
    cv2.putText(overlay, info_text, (x_pos + padding, y_pos), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2)
    
    # Apply overlay with transparency
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    
    # Add subtle border
    cv2.rectangle(img, (x_pos, y_pos - text_height - padding), 
                 (x_pos + rect_width, y_pos + padding), 
                 (200, 200, 200), 1)
    
    return img


def flood_fill(canvas, x, y, target_color, fill_color, tolerance=10):
    """Fill a region with a new color using flood fill algorithm"""
    h, w = canvas.shape[:2]
    
    # Bounds check
    if x < 0 or x >= w or y < 0 or y >= h:
        return canvas
    
    # Don't fill if target and fill colors are the same
    if np.array_equal(target_color, fill_color):
        return canvas
    
    # Create a copy to avoid modifying during iteration
    result = canvas.copy()
    visited = np.zeros((h, w), dtype=bool)
    
    # Use a stack for iterative flood fill (avoid recursion limits)
    stack = [(x, y)]
    
    def color_match(c1, c2):
        return np.sum(np.abs(c1.astype(int) - c2.astype(int))) <= tolerance
    
    while stack:
        px, py = stack.pop()
        
        if px < 0 or px >= w or py < 0 or py >= h:
            continue
        
        if visited[py, px]:
            continue
        
        pixel_color = canvas[py, px]
        
        if not color_match(pixel_color, target_color):
            continue
        
        visited[py, px] = True
        result[py, px] = fill_color
        
        # Add neighbors
        stack.append((px + 1, py))
        stack.append((px - 1, py))
        stack.append((px, py + 1))
        stack.append((px, py - 1))
    
    return result


def save_canvas_to_file(canvas):
    """Save the canvas to a PNG file with timestamp"""
    global save_counter
    
    # Create saves directory if it doesn't exist
    save_dir = "saved_drawings"
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    
    # Generate filename with timestamp
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"{save_dir}/drawing_{timestamp}_{save_counter:03d}.png"
    save_counter += 1
    
    # Save the canvas
    cv2.imwrite(filename, canvas)
    
    return filename


def apply_symmetry(canvas, x, y, prev_x, prev_y, color, thickness, symmetry_mode):
    """Draw with symmetry applied"""
    h, w = canvas.shape[:2]
    center_x, center_y = w // 2, h // 2
    
    if symmetry_mode == SymmetryMode.NONE:
        cv2.line(canvas, (prev_x, prev_y), (x, y), color, thickness)
    
    elif symmetry_mode == SymmetryMode.HORIZONTAL:
        # Original
        cv2.line(canvas, (prev_x, prev_y), (x, y), color, thickness)
        # Mirror horizontally
        mirror_x = w - x
        mirror_prev_x = w - prev_x
        cv2.line(canvas, (mirror_prev_x, prev_y), (mirror_x, y), color, thickness)
    
    elif symmetry_mode == SymmetryMode.VERTICAL:
        # Original
        cv2.line(canvas, (prev_x, prev_y), (x, y), color, thickness)
        # Mirror vertically
        mirror_y = h - y
        mirror_prev_y = h - prev_y
        cv2.line(canvas, (prev_x, mirror_prev_y), (x, mirror_y), color, thickness)
    
    elif symmetry_mode == SymmetryMode.BOTH:
        # Original
        cv2.line(canvas, (prev_x, prev_y), (x, y), color, thickness)
        # Horizontal mirror
        mirror_x = w - x
        mirror_prev_x = w - prev_x
        cv2.line(canvas, (mirror_prev_x, prev_y), (mirror_x, y), color, thickness)
        # Vertical mirror
        mirror_y = h - y
        mirror_prev_y = h - prev_y
        cv2.line(canvas, (prev_x, mirror_prev_y), (x, mirror_y), color, thickness)
        # Both mirrors
        cv2.line(canvas, (mirror_prev_x, mirror_prev_y), (mirror_x, mirror_y), color, thickness)
    
    elif symmetry_mode == SymmetryMode.RADIAL_4:
        # 4-way radial symmetry
        for angle in [0, 90, 180, 270]:
            rad = np.radians(angle)
            cos_a, sin_a = np.cos(rad), np.sin(rad)
            
            # Rotate point around center
            rel_x, rel_y = x - center_x, y - center_y
            rel_prev_x, rel_prev_y = prev_x - center_x, prev_y - center_y
            
            rot_x = int(rel_x * cos_a - rel_y * sin_a + center_x)
            rot_y = int(rel_x * sin_a + rel_y * cos_a + center_y)
            rot_prev_x = int(rel_prev_x * cos_a - rel_prev_y * sin_a + center_x)
            rot_prev_y = int(rel_prev_x * sin_a + rel_prev_y * cos_a + center_y)
            
            cv2.line(canvas, (rot_prev_x, rot_prev_y), (rot_x, rot_y), color, thickness)
    
    return canvas


# next step is to import those images
folder = "tools_images"
list_of_images = os.listdir(folder)
list_of_images = [f for f in list_of_images if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
# print(list_of_images)
list_of_images.sort(key=lambda f: int(os.path.splitext(f)[0]))
# sorting the images in custom order

overlist = []
for image_path in list_of_images:
    image = cv2.imread(f'{folder}/{image_path}')
    overlist.append(image)
# print(len(overlist))
header = overlist[0]

# Create modern UI for the header with brush sizes and shape tools
def create_header_ui(header_img, selected_size, shape_mode):
    # Start with a clean slate - create a modern-looking header
    header_height, header_width = header_img.shape[:2]
    header_copy = np.ones((header_height, header_width, 3), dtype=np.uint8) * 245  # Lighter background
    
    # Add a subtle gradient to the header
    for i in range(header_height):
        alpha = 0.9 - (i / header_height) * 0.2  # Softer gradient
        header_copy[i, :] = np.ones(3) * (245 * alpha + 230 * (1-alpha))
    
    # Add divider line at the bottom of the header
    cv2.line(header_copy, (0, header_height-1), (header_width, header_height-1), (180, 180, 180), 3)
    
    # === LEFT SECTION: App Title & Tool Mode ===
    # App title
    cv2.putText(header_copy, "Virtual Painter", (15, 28), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (50, 50, 50), 2)
    
    # Current Tool Mode indicator (prominent)
    tool_names = ["DRAW", "FILL", "PICK"]
    tool_colors = [(100, 150, 255), (255, 150, 100), (150, 255, 150)]
    current_tool_name = tool_names[current_tool_mode.value]
    current_tool_color = tool_colors[current_tool_mode.value]
    
    cv2.rectangle(header_copy, (15, 45), (140, 85), current_tool_color, cv2.FILLED)
    cv2.rectangle(header_copy, (15, 45), (140, 85), (80, 80, 80), 2)
    cv2.putText(header_copy, f"Tool: {current_tool_name}", (22, 70), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
    
    # Symmetry Mode indicator
    sym_names = ["None", "H-Mir", "V-Mir", "Both", "Rad-4"]
    sym_color = (200, 220, 255) if current_symmetry_mode != SymmetryMode.NONE else (220, 220, 220)
    cv2.rectangle(header_copy, (15, 95), (140, 120), sym_color, cv2.FILLED)
    cv2.rectangle(header_copy, (15, 95), (140, 120), (100, 100, 100), 1)
    cv2.putText(header_copy, f"Sym: {sym_names[current_symmetry_mode.value]}", (22, 113), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (40, 40, 100), 1)
    
    # === COLOR SECTION ===
    color_section_start = 170
    
    # Section title
    cv2.putText(header_copy, "Colors", (color_section_start, 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 70, 70), 2)
    
    # Color buttons (larger, more prominent)
    color_positions = [
        (color_section_start + 40, 65, (250, 0, 0)),      # Blue 
        (color_section_start + 105, 65, (153, 255, 255)),  # Yellow
        (color_section_start + 170, 65, (52, 66, 227)),   # Red
        (color_section_start + 235, 65, (60, 179, 113)),  # Green
        (color_section_start + 300, 65, (0, 0, 0))        # Black (Eraser)
    ]
    
    for i, (x, y, color) in enumerate(color_positions):
        # Draw color circle with 3D effect
        cv2.circle(header_copy, (x+1, y+1), 23, (150, 150, 150), cv2.FILLED)  # Shadow
        
        # Special case for eraser (last color)
        if i == len(color_positions) - 1:  # Eraser
            # Draw eraser background
            cv2.circle(header_copy, (x, y), 23, (230, 230, 230), cv2.FILLED)
            # Draw eraser icon (X)
            cv2.line(header_copy, (x-12, y-12), (x+8, y+8), (80, 80, 80), 3)
            cv2.line(header_copy, (x+8, y-12), (x-12, y+8), (80, 80, 80), 3)
            # Add "ERASER" text below
            cv2.putText(header_copy, "ERASER", (x-24, y+32), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (60, 60, 60), 1)
            # Highlighted border
            cv2.circle(header_copy, (x, y), 24, (220, 60, 60), 2)
        else:
            # Normal color button
            cv2.circle(header_copy, (x, y), 23, color, cv2.FILLED)
            cv2.circle(header_copy, (x, y), 23, (180, 180, 180), 2)  # Thicker border
    
    # === BRUSH SIZE SECTION ===
    brush_section_start = 540
    
    # Section divider
    cv2.line(header_copy, (brush_section_start-10, 15), 
             (brush_section_start-10, header_height-15), (170, 170, 170), 2)
    
    # Section title
    cv2.putText(header_copy, "Brush Size", (brush_section_start, 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 70, 70), 2)
    
    # Draw three size buttons
    for i, size in enumerate(brush_sizes):
        center_x = brush_section_start + i * 65 + 35
        center_y = 65
        
        # 3D effect for buttons
        if i == selected_size:
            # Selected button - highlighted
            cv2.circle(header_copy, (center_x+1, center_y+1), 28, (120, 120, 180), cv2.FILLED)
            cv2.circle(header_copy, (center_x, center_y), 28, (150, 150, 230), cv2.FILLED)
        else:
            # Regular button
            cv2.circle(header_copy, (center_x+1, center_y+1), 28, (150, 150, 150), cv2.FILLED)
            cv2.circle(header_copy, (center_x, center_y), 28, (225, 225, 225), cv2.FILLED)
        
        # Inner circle representing brush size
        cv2.circle(header_copy, (center_x, center_y), min(size//2 + 1, 20), (50, 50, 50), cv2.FILLED)
        
        # Label below
        size_labels = ["Small", "Medium", "Large"]
        cv2.putText(header_copy, size_labels[i], (center_x-22, center_y+42), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (80, 80, 80), 1)
    
    # === SHAPES SECTION ===
    shape_section_start = 760
    
    # Section divider
    cv2.line(header_copy, (shape_section_start-10, 15), 
             (shape_section_start-10, header_height-15), (170, 170, 170), 2)
    
    # Section title
    cv2.putText(header_copy, "Shapes", (shape_section_start, 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 70, 70), 2)
    
    # Shape tools
    shape_labels = ["PEN", "LINE", "RECT", "CIRC"]
    shape_modes = [ShapeMode.FREEHAND, ShapeMode.LINE, ShapeMode.RECTANGLE, ShapeMode.CIRCLE]
    
    for i, mode in enumerate(shape_modes):
        pos_x = shape_section_start + i * 55 + 5
        pos_y = 45
        
        # 3D button effect
        if mode == shape_mode:
            # Selected - highlighted
            cv2.rectangle(header_copy, (pos_x+1, pos_y+1), (pos_x+46, pos_y+46), 
                          (120, 180, 120), cv2.FILLED)
            cv2.rectangle(header_copy, (pos_x, pos_y), (pos_x+45, pos_y+45), 
                          (150, 230, 150), cv2.FILLED)
            border_color = (80, 180, 80)
            text_color = (255, 255, 255)
        else:
            cv2.rectangle(header_copy, (pos_x+1, pos_y+1), (pos_x+46, pos_y+46), 
                          (150, 150, 150), cv2.FILLED)
            cv2.rectangle(header_copy, (pos_x, pos_y), (pos_x+45, pos_y+45), 
                          (225, 225, 225), cv2.FILLED)
            border_color = (180, 180, 180)
            text_color = (60, 60, 60)
        
        cv2.rectangle(header_copy, (pos_x, pos_y), (pos_x+45, pos_y+45), border_color, 2)
        
        # Label
        x_offset = 8 if len(shape_labels[i]) == 4 else 5
        cv2.putText(header_copy, shape_labels[i], (pos_x+x_offset, pos_y+30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, text_color, 2)
    
    # === HELP SECTION ===
    help_section_start = 1000
    
    # Section divider
    cv2.line(header_copy, (help_section_start-10, 15), 
             (help_section_start-10, header_height-15), (170, 170, 170), 2)
    
    # Quick help
    cv2.putText(header_copy, "Quick Help", (help_section_start, 25), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (70, 70, 70), 2)
    
    # Gesture hints in compact format
    help_text = [
        "3 Fingers: Undo",
        "4 Fingers: Redo",
        "Pinky: Shapes",
        "Palm: Symmetry",
        "S: Save PNG"
    ]
    
    y_help = 48
    for text in help_text:
        cv2.putText(header_copy, text, (help_section_start + 5, y_help), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 80, 80), 1)
        y_help += 15
    
    return header_copy


capture = cv2.VideoCapture(0)
if not capture.isOpened():
    print("Error: Could not open camera. Please check camera permissions.")
    print("On macOS, you may need to grant VS Code or Terminal access to your camera in System Preferences -> Security & Privacy -> Privacy -> Camera")
    exit(1)
    
capture.set(3, 1280)
capture.set(4, 720)

xprev, yprev = 0, 0
actual_canvas = np.zeros((720, 1280, 3), np.uint8)
stroke_started = False  # To track if a stroke has started

# Save initial blank canvas
save_stroke(actual_canvas)

# Create header with UI elements
header_with_ui = create_header_ui(header, current_size_idx, current_shape_mode)

while True:
    # reading the capture
    # flipping the image because otherwise it is difficult to keep a record of the drawing for the user
    success, img = capture.read()
    img = cv2.flip(img, 1)

    # Create a slightly larger canvas for the sidebar (200px wider now)
    display_img = np.zeros((720, 1280 + 200, 3), dtype=np.uint8)
    
    # using our two functions as modules for providing image and the landmarks list
    img = findhands(img, draw=True)[0]
    results = findhands(img, draw=False)[1]
    lmList = position(img, results, draw=True)

    # Track if any special gesture was detected in this frame
    gesture_detected = False
    active_message = None  # Current message to display

    # we need to define some rules of our canvas, when two fingers are up, it is the selection mode
    if len(lmList) != 0:
        xindex, yindex = lmList[8][1], lmList[8][2]
        # Update last known index fingertip position
        last_index_pos = (xindex, yindex)
        xmiddle, ymiddle = lmList[12][1], lmList[12][2]

        # Get thumb position if available (for dynamic brush size)
        thumb_detected = False
        if len(lmList) > 4:  # Ensure thumb landmark (ID: 4) exists
            xthumb, ythumb = lmList[4][1], lmList[4][2]
            thumb_detected = True

        # Check for all fingers (for undo/redo gestures)
        fingers_status, num_fingers = count_fingers_up(lmList)
        # Normalize when landmarks missing
        if not fingers_status:
            fingers_status = [0, 0, 0, 0, 0]
        
        # Check for undo gesture (three fingers up - middle, ring, pinky)
        if fingers_status and fingers_status[0] == 0 and fingers_status[1] == 0 and sum(fingers_status[2:]) == 3:
            # Only trigger once when gesture is first detected
            if num_fingers == 3:
                gesture_detected = True
                actual_canvas = undo_action(actual_canvas)
                active_message = "Undo Action"
                time.sleep(0.1)  # Small delay to prevent multiple undos
        
        # Check for redo gesture (four fingers up - index, middle, ring, pinky)
        elif fingers_status and fingers_status[0] == 0 and sum(fingers_status[1:]) == 4:
            # Only trigger once when gesture is first detected
            if num_fingers == 4:
                gesture_detected = True
                actual_canvas = redo_action(actual_canvas)
                active_message = "Redo Action"
                time.sleep(0.1)  # Small delay to prevent multiple redos
                
        # Check for shape mode toggle (pinky finger up) using rising-edge + debounce
        elif fingers_status[0] == 0 and fingers_status[1] == 0 and fingers_status[2] == 0 and fingers_status[3] == 0 and fingers_status[4] == 1:
            now = time.time()
            # Rising edge: previous pinky down, now up
            if previous_fingers[4] == 0 and (now - last_shape_toggle_time) > SHAPE_TOGGLE_DEBOUNCE:
                gesture_detected = True
                last_shape_toggle_time = now
                current_shape_mode = ShapeMode((current_shape_mode.value + 1) % len(ShapeMode))

                # Update UI with new shape mode
                header_with_ui = create_header_ui(header, current_size_idx, current_shape_mode)

                # Show mode change notification
                shape_mode_names = ["Freehand", "Line", "Rectangle", "Circle"]
                active_message = f"Shape Mode: {shape_mode_names[current_shape_mode.value]}"
            # else: ignore (debounced or still held)
        
        # Check for symmetry mode toggle (all 5 fingers up - open palm) using rising-edge + debounce
        elif fingers_status[0] == 1 and fingers_status[1] == 1 and fingers_status[2] == 1 and fingers_status[3] == 1 and fingers_status[4] == 1:
            now = time.time()
            # Rising edge: check if any finger was previously down
            if (sum(previous_fingers) < 5) and (now - last_symmetry_toggle_time) > SYMMETRY_TOGGLE_DEBOUNCE:
                gesture_detected = True
                last_symmetry_toggle_time = now
                current_symmetry_mode = SymmetryMode((current_symmetry_mode.value + 1) % len(SymmetryMode))

                # Update UI with new symmetry mode
                header_with_ui = create_header_ui(header, current_size_idx, current_shape_mode)

                # Show mode change notification
                symmetry_names = ["None", "Horizontal Mirror", "Vertical Mirror", "Both Mirrors", "Radial 4-Way"]
                active_message = f"Symmetry: {symmetry_names[current_symmetry_mode.value]}"
            # else: ignore (debounced or still held)

        # we now have to use the finger counter for these two
        ups = []
        if yindex < lmList[6][2]:
            ups.append(1)
        if ymiddle < lmList[10][2]:
            ups.append(1)
        
        # now depending on the length of ups, our functions will be decided
        fingers = len(ups)
        if fingers >= 1 and not gesture_detected:
            if fingers == 2:
                # Selection mode - visualize selection cursor
                selection_radius = 10
                # Draw a selection cursor
                cv2.circle(img, (xindex, yindex), selection_radius, (0, 120, 255), 2)
                cv2.line(img, (xindex-15, yindex), (xindex+15, yindex), (0, 120, 255), 1)
                cv2.line(img, (xindex, yindex-15), (xindex, yindex+15), (0, 120, 255), 1)
                
                # Reset drawing pointers to avoid drawing lines while selecting
                xprev, yprev = None, None
                
                # Check for header selection
                if yindex < 125:
                    # Color selection (updated for new header layout)
                    color_section_start = 200
                    color_positions = [
                        (color_section_start + 35, 60, (250, 0, 0), "Blue"),      # Blue 
                        (color_section_start + 95, 60, (153, 255, 255), "Yellow"),  # Yellow
                        (color_section_start + 155, 60, (52, 66, 227), "Red"),   # Red
                        (color_section_start + 215, 60, (60, 179, 113), "Green"),  # Green
                        (color_section_start + 275, 60, (0, 0, 0), "Eraser")        # Black (Eraser)
                    ]
                    
                    # Check if user is selecting a color
                    color_selected = False
                    for i, (x, y, color, name) in enumerate(color_positions):
                        if calculate_distance((x, y), (xindex, yindex)) < 25:
                            draw_color = color
                            color_selected = True
                            # Special message for eraser
                            if name == "Eraser":
                                active_message = "Eraser Mode Activated - Use to Clear Canvas"
                            else:
                                active_message = f"Selected: {name}"
                            
                    # Brush size selection (updated for new header layout)
                    brush_section_start = 580
                    for i, size in enumerate(brush_sizes):
                        center_x = brush_section_start + i * 60 + 30
                        center_y = 60
                        
                        if calculate_distance((center_x, center_y), (xindex, yindex)) < 25:
                            current_size_idx = i
                            brush_thickness = brush_sizes[current_size_idx]
                            active_message = f"Brush Size: {brush_thickness}px"
                    
                    # Shape mode selection (updated for new header layout)
                    shape_section_start = 800
                    shape_labels = ["Freehand", "Line", "Rectangle", "Circle"]
                    for i, mode in enumerate([ShapeMode.FREEHAND, ShapeMode.LINE, ShapeMode.RECTANGLE, ShapeMode.CIRCLE]):
                        pos_x = shape_section_start + i * 50 + 20
                        pos_y = 60
                        
                        if calculate_distance((pos_x, pos_y), (xindex, yindex)) < 25:
                            current_shape_mode = mode
                            active_message = f"Shape: {shape_labels[mode.value]}"
                    
                    # Update header UI with current selections
                    header_with_ui = create_header_ui(header, current_size_idx, current_shape_mode)

            else:
                # Drawing mode
                
                # Dynamic brush size based on thumb-index distance if thumb is detected
                current_thickness = brush_thickness
                if thumb_detected:
                    current_thickness = dynamic_brush_thickness(lmList[4], lmList[8])
                
                # Display enhanced brush cursor
                brush_radius = current_thickness // 2
                # Inner circle (filled)
                cv2.circle(img, (xindex, yindex), brush_radius-1, draw_color, cv2.FILLED)
                # Outer ring (outline)
                cv2.circle(img, (xindex, yindex), brush_radius+1, (255, 255, 255), 2)
                
                # Different behavior based on shape mode
                if current_shape_mode == ShapeMode.FREEHAND:
                    # Regular freehand drawing
                    if xprev is None and yprev is None:
                        xprev, yprev = xindex, yindex
                        stroke_started = True
                        # New stroke notification
                        active_message = "Freehand Drawing" if draw_color != (0, 0, 0) else "Erasing"
                    
                    # Draw the line with interpolation for smoother drawing
                    if draw_color != (0, 0, 0):
                        # Calculate distance between current and previous point
                        dist = calculate_distance((xprev, yprev), (xindex, yindex))
                        
                        # If distance is too large, interpolate intermediate points
                        if dist > 20:  # Only interpolate if distance is significant
                            steps = int(dist // 10)  # Number of intermediate points
                            for i in range(1, steps):
                                # Calculate intermediate point
                                x = xprev + (xindex - xprev) * i // steps
                                y = yprev + (yindex - yprev) * i // steps
                                
                                # Draw intermediate points with symmetry
                                cv2.line(img, (xprev, yprev), (x, y), draw_color, current_thickness)
                                cv2.line(actual_canvas, (xprev, yprev), (x, y), draw_color, current_thickness)
                                
                                # Apply symmetry if enabled
                                if current_symmetry_mode != SymmetryMode.NONE:
                                    img = apply_symmetry(img, x, y, xprev, yprev, draw_color, current_thickness, current_symmetry_mode)
                                    actual_canvas = apply_symmetry(actual_canvas, x, y, xprev, yprev, draw_color, current_thickness, current_symmetry_mode)
                                
                                xprev, yprev = x, y
                                
                        # Draw final segment with symmetry
                        cv2.line(img, (xprev, yprev), (xindex, yindex), draw_color, current_thickness)
                        cv2.line(actual_canvas, (xprev, yprev), (xindex, yindex), draw_color, current_thickness)
                        
                        # Apply symmetry if enabled
                        if current_symmetry_mode != SymmetryMode.NONE:
                            img = apply_symmetry(img, xindex, yindex, xprev, yprev, draw_color, current_thickness, current_symmetry_mode)
                            actual_canvas = apply_symmetry(actual_canvas, xindex, yindex, xprev, yprev, draw_color, current_thickness, current_symmetry_mode)
                    else:
                        # Eraser is always thicker with same interpolation logic
                        eraser_thickness = max(current_thickness * 2, 60)  # Reduced maximum thickness
                        
                        # Calculate distance between current and previous point
                        dist = calculate_distance((xprev, yprev), (xindex, yindex))
                        
                        # If distance is too large, interpolate intermediate points
                        if dist > 20:  # Only interpolate if distance is significant
                            steps = int(dist // 10)  # Number of intermediate points
                            for i in range(1, steps):
                                # Calculate intermediate point
                                x = xprev + (xindex - xprev) * i // steps
                                y = yprev + (yindex - yprev) * i // steps
                                
                                # Draw intermediate points
                                cv2.line(img, (xprev, yprev), (x, y), draw_color, eraser_thickness)
                                cv2.line(actual_canvas, (xprev, yprev), (x, y), draw_color, eraser_thickness)
                                
                                xprev, yprev = x, y
                                
                        # Draw final segment
                        cv2.line(img, (xprev, yprev), (xindex, yindex), draw_color, eraser_thickness)
                        cv2.line(actual_canvas, (xprev, yprev), (xindex, yindex), draw_color, eraser_thickness)
                    
                    xprev, yprev = xindex, yindex
                    
                else:
                    # Shape drawing mode
                    if shape_start_point is None:
                        # First point of the shape
                        shape_start_point = (xindex, yindex)
                        # Save the current canvas for undoing if needed
                        save_stroke(actual_canvas)
                        stroke_started = True
                        
                        # Shape starting notification
                        shape_mode_names = ["Freehand", "Line", "Rectangle", "Circle"]
                        active_message = f"Drawing {shape_mode_names[current_shape_mode.value]}"
                    else:
                        # Show preview of the shape without committing it
                        shape_preview = draw_shape(img, actual_canvas, current_shape_mode, 
                                                 shape_start_point, (xindex, yindex), draw_color, current_thickness)
                        
                        # Display shape preview instructions nicely
                        display_info_overlay(img, 
                                            f"Drawing {shape_mode_names[current_shape_mode.value]} - Release to complete", 
                                            'bottom')
                
                # Display dynamic brush size indicator when using thumb-index gesture
                if thumb_detected:
                    distance = calculate_distance([lmList[4][1], lmList[4][2]], [lmList[8][1], lmList[8][2]])
                    # Show size change as a subtle overlay
                    display_info_overlay(img, f"Brush Size: {current_thickness}px", 
                                        (xindex + 30, yindex - 20))
    else:
        # If a stroke was in progress and now the hand is not detected or fingers are down
        if stroke_started:
            if current_shape_mode == ShapeMode.FREEHAND:
                if xprev is not None and yprev is not None:
                    # Save canvas for undo operation when completing a freehand stroke
                    save_stroke(actual_canvas)
                    active_message = "Stroke Completed"
            else:
                # For shapes, finalize the shape when hand is lowered or disappears
                if shape_start_point is not None:
                    # Prefer the last known index fingertip position
                    if last_index_pos is not None:
                        end_point = last_index_pos
                    else:
                        end_point = shape_start_point

                    # Draw the final shape on the canvas
                    actual_canvas = draw_shape(img, actual_canvas, current_shape_mode, 
                                            shape_start_point, end_point, draw_color, brush_thickness)
                    # Save the canvas with the new shape
                    save_stroke(actual_canvas)

                    # Set notification about shape completion
                    shape_mode_names = ["Freehand", "Line", "Rectangle", "Circle"]
                    active_message = f"{shape_mode_names[current_shape_mode.value]} Completed"

                # Reset shape starting point
                shape_start_point = None

            stroke_started = False

        xprev, yprev = None, None
    
    # Create main image with canvas content
    img_gray = cv2.cvtColor(actual_canvas, cv2.COLOR_BGR2GRAY)
    _, imgInverse = cv2.threshold(img_gray, 50, 255, cv2.THRESH_BINARY_INV)
    imgInverse = cv2.cvtColor(imgInverse, cv2.COLOR_GRAY2BGR)
    img = cv2.bitwise_and(img, imgInverse)
    img = cv2.bitwise_or(img, actual_canvas)

    # Add modern header at the top
    img[0:125, 0:1280] = header_with_ui
    
    # Create the sidebar
    sidebar = create_sidebar(img, draw_color, brush_thickness, 
                           current_shape_mode, len(undo_stack), len(redo_stack))
    
    # Combine main image and sidebar
    display_img = np.zeros((720, 1280 + 200, 3), dtype=np.uint8)
    display_img[:, :1280] = img
    display_img[:, 1280:1480] = sidebar
    
    # Display any active notifications with the enhanced overlay
    if active_message:
        display_info_overlay(display_img, active_message, 'top', 
                           is_alert=("Undo" in active_message or "Redo" in active_message))

    # Update previous_fingers for rising-edge detection
    try:
        previous_fingers = fingers_status.copy()
    except Exception:
        # If fingers_status is not defined or not a list, keep previous
        pass
    
    # Add subtle corner logo/watermark
    cv2.putText(display_img, "Virtual Painter Pro", (display_img.shape[1]-200, display_img.shape[0]-20),
              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
    
    # Display the final image with all UI elements
    cv2.imshow("Virtual Painter", display_img)
    
    # Add key controls for adjusting smoothing settings
    key = cv2.waitKey(1) & 0xFF
    
    # Exit when 'q' is pressed
    if key == ord('q'):
        break
    # Increase smoothing with '+'
    elif key == ord('+') or key == ord('='):
        smoothing_factor = min(0.9, smoothing_factor + 0.05)
        active_message = f"Smoothing increased: {smoothing_factor:.2f}"
    # Decrease smoothing with '-'
    elif key == ord('-') or key == ord('_'):
        smoothing_factor = max(0.0, smoothing_factor - 0.05)
        active_message = f"Smoothing decreased: {smoothing_factor:.2f}"
    # Save canvas to PNG with 'S'
    elif key == ord('s') or key == ord('S'):
        filename = save_canvas_to_file(actual_canvas)
        active_message = f"Saved: {filename}"
        print(f"Canvas saved to: {filename}")
    # Clear canvas with 'C' (double press for confirmation)
    elif key == ord('c') or key == ord('C'):
        # Simple confirmation - press C twice within 2 seconds
        confirm_msg = "Press C again to CLEAR ALL"
        display_info_overlay(display_img, confirm_msg, 'center', is_alert=True)
        cv2.imshow("Virtual Painter", display_img)
        
        # Wait for confirmation
        start_wait = time.time()
        confirmed = False
        while time.time() - start_wait < 2.0:
            confirm_key = cv2.waitKey(100) & 0xFF
            if confirm_key == ord('c') or confirm_key == ord('C'):
                confirmed = True
                break
        
        if confirmed:
            # Clear the canvas
            actual_canvas = np.zeros((720, 1280, 3), dtype=np.uint8)
            undo_stack.clear()
            redo_stack.clear()
            active_message = "Canvas cleared!"
            print("Canvas cleared")
        else:
            active_message = "Clear cancelled"

# Clean up
capture.release()
cv2.destroyAllWindows()
