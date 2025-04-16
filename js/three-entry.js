import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

THREE.GLTFLoader = GLTFLoader;
THREE.DRACOLoader = DRACOLoader;
THREE.RGBELoader = RGBELoader;

export default THREE;