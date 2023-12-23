// Function to upload file to FTP server
import ftp from "basic-ftp";
import stream from "stream";

export async function uploadToFTP(file) {
    const client = new ftp.Client();
  
    try {
      // Connect to the FTP server
      await client.access({
        host: "ftp.xn--12cbx8beub8evezb2evdwa3gkk.com",
        user: "u812684713.nextbackseo",
        password: "*Nextsoft1234",
        secure: false, // set to true for FTPS
      });
  
      // Set the remote path on the FTP server where you want to save the image
      const remotePath = "/app-images";
  
      // Convert the file buffer to a readable stream
      // const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
  
      // Upload the file to the FTP server
      await client.uploadFrom(bufferStream, `${remotePath}/${file.originalname}`);
      console.log("File uploaded to FTP server");
    } finally {
      // Close the FTP connection
      await client.close();
    }
  }

   // Function to delete file from FTP server
   export async function deleteFromFTP(filename) {
    const client = new ftp.Client();
  
    try {
      // Connect to the FTP server
      await client.access({
        host: "ftp.xn--12cbx8beub8evezb2evdwa3gkk.com",
        user: "u812684713.nextbackseo",
        password: "*Nextsoft1234",
        secure: false, // set to true for FTPS
      });
  
      // Set the remote path on the FTP server where the image is located
      const remotePath = "/app-images";
  
      // Delete the file from the FTP server
      await client.remove(`${remotePath}/${filename}`);
      console.log("File deleted from FTP server");
    } finally {
      // Close the FTP connection
      await client.close();
    }
  }