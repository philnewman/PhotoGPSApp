import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, FlatList, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

import * as FileSysterm from 'expo-file-system';
import * as AuthSession from 'expo-auth-session';

export default function App() {
  const cameraRef = useRef(null);
  const [hasCameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState([]);
  const [location, setLocation] = useState(null);
  const [sending, setSending] = useState(false);
  
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6iByJlhCpoxBIkl_utsmbx7y-uPhRALeghNqbPBvPTtoOrHQ3lD4fGhggVf1w5gxO/exec';
  
  useEffect(() => {
    (async () => {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri);

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    }
  };

  const saveEntry = async () => {
    if (!photoUri || !location) return;

    const asset = await MediaLibrary.createAssetAsync(photoUri);

    setEntries(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        uri: asset.uri,
        coords: location,
        note,
      },
    ]);

    setPhotoUri(null);
    setNote('');
  };
  
  // Phil - START
  
  const sendToGoogleSheet = async () => {
	  
	console.log("In sendToGoogleSheet")  
	  
 //   if (!photoUri || !location || !note) {
 //     Alert.alert('Missing Data', 'Please take a photo, add a note, and ensure location is available.');
  //    return;
  //  }

    setSending(true);

    const payload = {
      imageUrl: photoUri, // You could upload this to Imgur/Firebase later
      note,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.result === 'success') {
        // Alert.alert('Success', 'Data saved to Google Sheet!');
		console.log('Success - data saved to Google Sheet');
        setPhotoUri(null);
        setNote('');
		setLocation(null);
      } else {
       // Alert.alert('Error', 'Failed to save data.');
        console.log('Error - Failed to save data.');
      }
    } catch (err) {
     // Alert.alert('Error', err.message);
      console.log(err.message);
    } finally {
      setSending(false);
    }
  };
   
  // Phil - END

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
        <Button title="Grant Camera Permission" onPress={requestCameraPermission} />
      </View>
    );
  }

  if (!hasLocationPermission) {
    return (
      <View style={styles.center}>
        <Text>Requesting location permission...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <TextInput
            placeholder="Add a note..."
            style={styles.input}
            value={note}
            onChangeText={setNote}
          />
		  <Button title="Save To Google Sheets" onPress={sendToGoogleSheet} />
        </View>
      ) : (
        <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      )}
      <Button title={photoUri ? 'Retake Photo' : 'Take Picture'} onPress={takePicture} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <Text>{item.note}</Text>
            <Text style={styles.coords}>
              Lat: {item.coords.latitude.toFixed(4)} | Lon: {item.coords.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    padding: 10,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    height: 400,
    borderRadius: 10,
    marginBottom: 10,
  },
  previewContainer: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 400,
    marginBottom: 10,
    borderRadius: 10,
  },
  input: {
    borderColor: '#aaa',
    borderWidth: 1,
    padding: 8,
    width: '100%',
    marginBottom: 10,
    borderRadius: 5,
  },
  entry: {
    marginVertical: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  coords: {
    fontSize: 12,
    color: '#555',
  },
});

