"""
EXPERIMENTAL – not used by the app and does not run as-is.

This was an attempt to fine-tune best.pt on the images collected through the /retrain
endpoint (collect-retrain/images + collect-retrain/labels). It uses a plain PyTorch loop,
but YOLO models are normally trained with ultralytics' own API instead, e.g.:

    from ultralytics import YOLO
    model = YOLO("best.pt")
    model.train(data="data.yaml", epochs=50, imgsz=640)

where data.yaml lists the train/val image folders and the class names.
Kept for reference only.
"""
import torch
from torch.utils.data import DataLoader
from torchvision import transforms  # Assuming you use torchvision for dataset loading and preprocessing
from ultralytics import YOLO
import os
from PIL import Image  # Assuming you're working with image data


class CustomDataset(torch.utils.data.Dataset):
    def __init__(self, root, transform=None):
        self.root = root
        self.transform = transform
        self.images = []  # List to store image file paths
        self.targets = []  # List to store corresponding target data (labels or annotations)

        # Load image file paths and corresponding targets
        for file_name in os.listdir(root):
            if file_name.endswith('.jpg') or file_name.endswith('.png'):  # Check if file is an image
                image_path = os.path.join(root, file_name)
                self.images.append(image_path)

                # Assuming corresponding targets are stored in a file with the same name but different extension-
                # You need to replace this with your own logic to load targets
                target_path = os.path.splitext(image_path)[0] + '.txt'  # Assuming targets are stored as text files
                self.targets.append(target_path)

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image_path = self.images[idx]
        target_path = self.targets[idx]

        # Load image
        image = Image.open(image_path).convert("RGB")  # Convert image to RGB format if needed
        if self.transform:
            image = self.transform(image)

        # Load target data (labels or annotations)
        # You need to replace this with your own logic to load targets
        with open(target_path, 'r') as file:
            target = file.read().strip()  # Read target data from file
            # You may need to further process the target data depending on your task

        return image, target



# Function to load dataset
def load_dataset(path):
    # Example code to load and preprocess dataset using torchvision
    transform = transforms.Compose([
        transforms.Resize((416, 416)),  # Resize images to the input size of the YOLO model
        transforms.ToTensor(),  # Convert images to tensors
        # Add more transformations as needed
    ])
    dataset = CustomDataset(root=path, transform=transform)  # Replace YourDatasetClass with your dataset class
    return dataset

# Load the model with pre-trained weights
model = YOLO("/code/best.pt")  # Replace with your model path

# Set the model to training mode
model.train()

# Load the dataset
train_loader = DataLoader(load_dataset(path="/code/collect-retrain/"), batch_size=32, shuffle=True)

# Define optimizer and loss function
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = torch.nn.MSELoss()  # Adjust loss function if needed

# Training loop
for epoch in range(10):  # Adjust the number of epochs
    for images, targets in train_loader:
        outputs = model(images)
        loss = criterion(outputs, targets)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    print(f"Epoch [{epoch+1}/{10}], Loss: {loss.item():.4f}")

# Save the fine-tuned model
torch.save(model.state_dict(), "fine_tuned_model.pt")





