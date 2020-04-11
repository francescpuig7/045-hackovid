import {Component, OnInit} from '@angular/core';
import {Alert, AlertController, ModalController, ToastController} from 'ionic-angular';
import {CreateRequestPage} from "../create-request/create-request";
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import Geolocation from 'ol/Geolocation';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Icon, Style} from 'ol/style';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';

import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {Request} from "../../models/request";

import {fromLonLat} from 'ol/proj';
import {UserSevice} from "../../services/user.sevice";
import * as firebaseApp from 'firebase/app';
import * as geofirex from 'geofirex';



@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit {

  private requestCollection: AngularFirestoreCollection<Request>;
  private map: Map;
  private markersLayer: VectorLayer;
  private geolocationLayer: VectorLayer;
  private selectedRequest: Request;

  canAddRequests: boolean;

  constructor(
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private alertCtrl: AlertController,
    private userSevice: UserSevice,
    private afs: AngularFirestore) {
  }

  ngOnInit(): void {
    this.requestCollection = this.afs.collection('requests');
    this.canAddRequests = this.userSevice.isSuperUser() || this.userSevice.isEntitatUser();
    let firstTime = true;
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          })
        })
      ],
      view: new View({
        center: [313986.42, 5158087.34],
        zoom: 14
      })
    });


    this.markersLayer = new VectorLayer({
      source: new VectorSource({
        features: []
      })
    });
    this.map.addLayer(this.markersLayer);

    this.geolocationLayer = new VectorLayer({
      source: new VectorSource({
          features: []
      })
    })
    this.geolocationLayer.set('name', name)
    this.geolocationLayer.setZIndex(10)
    this.map.addLayer(this.geolocationLayer);

    var geolocation = new Geolocation({
      // enableHighAccuracy must be set to true to have the heading value.
      tracking:true,
      trackingOptions: {
        enableHighAccuracy: true,
        maximumAge:2000
      },
      projection: this.map.getView().getProjection()
    });

    geolocation.on('change', ()=>{

        var pos = geolocation.getPosition();
        if (firstTime){
          firstTime = false;
          this.center(pos[0],pos[1]);
        }
        this.addMarkerPosition('myPos', pos[0], pos[1], 'assets/imgs/myPos.svg');
    })

    /*let deviceOrientation = new ol.DeviceOrientation({
      tracking: true
    });
    deviceOrientation.on('change', event => {
        this.map.getLayers().getArray().forEach(element => {
            if (element.get('name') === 'myPos') {
                element.getSource().getFeatures()[0].getStyle().getImage().setRotation(-(deviceOrientation.getAlpha() + 1.5));
                element.getSource().refresh();
            }
        });

    });*/



    this.requestCollection.valueChanges().subscribe((requests: Request[]) => {
      let features = [];
      for (var i in requests) {
        let req = requests[i];
        console.log(req);
        /*var longitude = req.location;
        var latitude = req.location;*/

        var iconFeature = new Feature({
          geometry: new Point(fromLonLat([req.location.geopoint.longitude,req.location.geopoint.latitude]))
            });

            var geo = geofirex.init(firebaseApp);
            var point = geo.point(req.location.geopoint.longitude, req.location.geopoint.latitude);
            var radius = 10;
            var field = 'position';
            var query = geo.query('requests').within(point, radius, field);

            let iconsrc = "http://cdn.mapmarker.io/api/v1/pin?text=P&size=50&hoffset=1&background=FACF1B";//groc
            if (req.status === "accepted"){
              iconsrc = "http://cdn.mapmarker.io/api/v1/pin?text=A&size=50&hoffset=1&background=598BF7";//blau
            }else if (req.status ===  "completed"){
              iconsrc = "http://cdn.mapmarker.io/api/v1/pin?text=C&size=50&hoffset=1&background=0EE548";//verd
            }


        var iconStyle = new Style({
          image: new Icon(({
            anchor: [0.5, 1],
            src: iconsrc
          }))
        });

        iconFeature.setStyle(iconStyle);
        iconFeature["request"] = req;
        features.push(iconFeature);
      }
      this.markersLayer.getSource().clear(true);
      this.markersLayer.getSource().addFeatures(features);
    });


    this.map.on('click', (evt) => {
      var feature = this.map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      });
      console.log(feature);
      if (feature && feature["request"]) {
        this.selectedRequest = feature["request"];
        let alert: Alert;
        switch (this.selectedRequest.status) {
          case 'pending':
            alert = this.alertCtrl.create({
              title: this.selectedRequest.title,
              message: this.selectedRequest.description,
              buttons: [
                {
                  text: 'Cancel·la'
                },
                {
                  text: 'Accepta la petició',
                  handler: () => {
                    this.requestCollection.doc(this.selectedRequest.uuid).update({
                      status: 'accepted',
                      acceptedBy: this.userSevice.getCurrentUser().uid,
                      acceptedAt: new Date().getTime()
                    }).then(() => {
                      const acceptedRequestToast = this.toastController.create({
                        message: 'Has acceptat la petició.',
                        duration: 3000
                      });
                      acceptedRequestToast.present();
                    });
                  }
                }
              ]
            });
            alert.present();
            break;
          case 'accepted':
            alert = this.alertCtrl.create({
              title: this.selectedRequest.title,
              message: this.selectedRequest.description,
              buttons: [
                {
                  text: 'Tanca'
                },
                {
                  text: 'Rebutja',
                  handler: () => {
                    this.requestCollection.doc(this.selectedRequest.uuid).update({
                      status: 'pending',
                      acceptedBy: null,
                      acceptedAt: null
                    }).then(() => {
                      const canceledRequestToast = this.toastController.create({
                        message: 'Has cancel·lat la petició',
                        duration: 3000
                      });
                      canceledRequestToast.present();
                    })
                  }
                }
              ]
            });
            alert.present();
            break;
        }
      }
      else this.selectedRequest = null;
    });
  }


  onClickAddRequest(): void {
    const modal = this.modalCtrl.create(CreateRequestPage);
    modal.present();
    modal.onDidDismiss((action) => {
      switch (action) {
        case 'created':
          const toast = this.toastController.create({
            message: `La teva petició s'ha creat correctament.`,
            duration: 3000
          });
          toast.present();
          break;
        case 'canceled':
          break;
      }

    });
  }

  randomGeo(lon, lat) {
    var u = Math.random();

    if (u < 0.5)
      return [lon - Math.random() * 1000, lat - Math.random() * 1000];
    else
      return [lon + Math.random() * 1000, lat + Math.random() * 1000]
  }

  addMarkerPosition(name, lng, lat, img) {
    this.geolocationLayer.getSource().clear(true);
      let style = new Icon({
          src: img,
          scale: 1,
          rotation: 0,
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          opacity: 1
      })
      var feature = new Feature({
          geometry: new Point([lng, lat]),
      })

      feature.set('name', name)

      feature.setStyle(new Style({
          image: style
      }))

      this.geolocationLayer.getSource().addFeatures( [feature]);
  }

  center(lon, lat) {
      let feature = new Feature({
          geometry: new Point([lon, lat]),
      });
      this.map.getView().fit(feature.getGeometry());
      this.map.getView().setZoom(14);
    }

}
