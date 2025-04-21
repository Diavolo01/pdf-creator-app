# Use the official Node.js 20.11.0 image as the base
FROM node:20.11.0

# Set the working directory inside the container
WORKDIR .
# Install dependencies
RUN npm install
# Copy only package.json and package-lock.json (if available)
COPY package.json package-lock.json ./



# Copy the rest of the application files
COPY . .

# Expose the port your app runs on (optional, for documentation purposes)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
