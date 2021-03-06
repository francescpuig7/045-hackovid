import {Component, OnInit} from "@angular/core";
import {NavParams, ViewController} from "ionic-angular";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AngularFirestore, DocumentChangeAction} from "@angular/fire/firestore";
import {Request} from "../../../models/request";
import {first} from "rxjs/operators";
import {GoogleMap, GoogleMapOptions, GoogleMaps, GoogleMapsEvent, LatLng} from "@ionic-native/google-maps";
import * as firebaseApp from 'firebase/app';
import * as geofirex from 'geofirex';
import {GeoFireClient} from 'geofirex';

@Component({
  templateUrl: './edit-request.html'
})
export class EditRequestPage implements OnInit {

  form: FormGroup;

  selectedRequest: DocumentChangeAction<Request>;

  canBeDeleted: boolean;

  private map: GoogleMap;

  private chosenCoordinates: { lat: number, lon: number };

  private geoClient: GeoFireClient;

  constructor(private navParams: NavParams, private viewCtrl: ViewController, private fb: FormBuilder, private afs: AngularFirestore) {
    this.geoClient = geofirex.init(firebaseApp);
  }

  ngOnInit(): void {
    const id = this.navParams.get('id');
    this.form = this.fb.group({
      'title': ['', [Validators.required]],
      'description': ['', [Validators.required]],
      'deliveryDate': [''],
      'name': [''],
      'phone': [''],
      'email': ['']
    })
    this.afs.collection<Request>('requests', ref => ref.where('uuid', '==', id)).snapshotChanges().pipe(first()).subscribe(([document]: [DocumentChangeAction<Request>]) => {
      this.selectedRequest = document;
      this.canBeDeleted = this.selectedRequest.payload.doc.data().status === 'pending';
      this.form.patchValue(document.payload.doc.data());
      this.initalizeMap();
    });
  }

  onClickDelete(): void {
    this.afs.collection('requests').doc(this.selectedRequest.payload.doc.id).delete().then(() => {
      this.viewCtrl.dismiss('deleted');
    });
  }

  onClickSave(): void {
    const geopoint = this.geoClient.point(this.chosenCoordinates.lat, this.chosenCoordinates.lon);
    this.afs.collection('requests').doc(this.selectedRequest.payload.doc.id).update({
      ...this.form.getRawValue(),
      location: geopoint,
      editedAt: new Date().getTime()
    }).then(() => {
      this.viewCtrl.dismiss('edited');
    });
  }

  onClickDismiss(): void {
    this.viewCtrl.dismiss('canceled');
  }

  private initalizeMap(): void {
    let geolocation = this.selectedRequest.payload.doc.data().location as any;
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: geolocation.geopoint.latitude,
          lng: geolocation.geopoint.longitude
        },
        zoom: 15,
        tilt: 30
      }
    };
    this.map = GoogleMaps.create('mapRequest', mapOptions);

    this.map.addMarker({
      title: '',
      position: {
        lat: geolocation.geopoint.latitude,
        lng: geolocation.geopoint.longitude
      }
    });

    this.map.on(GoogleMapsEvent.MAP_CLICK).subscribe(([latLng]: [LatLng]) => {
      this.chosenCoordinates = {lat: latLng.lat, lon: latLng.lng};
      this.map.clear();
      this.map.addMarker({
        title: '',
        position: {
          lat: latLng.lat,
          lng: latLng.lng
        }
      });
    });
  }
}
