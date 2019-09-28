import { Component, OnInit } from '@angular/core';
import { Publication } from './../interfaces/publication';
import { AppService } from './../app.service';
import { MatSnackBar } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { FormatDateService } from './../shared/formatDateService/format-date.service';
import { SessionService } from './../shared/sessionService/session.service';
import { Professional } from '../interfaces/professional';
import { OpenModalService } from './../shared/modal-dialog/open-modal-service.service';
import { ExternalService } from 'src/config/externalServices.service';

@Component({
  selector: 'app-postagens',
  templateUrl: './postagens.component.html',
  styleUrls: ['./postagens.component.css']
})

export class PostagensComponent implements OnInit {
  public publication: Publication = {} as Publication;
  public isMyProfile = false;
  public showSpinner = false;
  public userPublications: Publication[] = [];
  public usuario: Professional = {} as Professional;
  public topics = [];
  public alreadyRecommended;
  public recommendationLength;

  constructor(
    private appservice: AppService,
    private snackbar: MatSnackBar,
    private route: ActivatedRoute,
    private formatDateService: FormatDateService,
    private sessionService: SessionService,
    private openModalService: OpenModalService,
    private externalService: ExternalService
    ) { }

  ngOnInit() {
    const userLoggedId = this.sessionService.getUserLogged();
    this.usuario.professionalID = this.route.snapshot.paramMap.get('id');
    if (userLoggedId === this.usuario.professionalID) {
      this.isMyProfile = true;
    } else {
      this.statusRecomendacao();
      this.getRecomendacoes();
    }
    this.retornaDadosUsuarios(this.usuario.professionalID);
    this.listarPostagens(this.usuario.professionalID);
    this.getProfessionalTopics(this.usuario.professionalID);
  }

  onSubmit() {
    this.showSpinner = true;
    this.publication.author = this.usuario.name;
    this.publication.professionalID = this.usuario.professionalID;
    if(this.publication.videoUrl){
      this.publication.thumbnailUrl = this.getThumbnailImage(this.publication.videoUrl)
    }
    this.appservice.cadastrarPublication(this.publication)
      .subscribe(res => {
        this.snackbar.open('Publicação feita com sucesso!', 'Dismiss', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });
        res.publicationDate = this.formatDateService.formatDate(res.publicationDate);
        this.showSpinner = false;
        this.userPublications.unshift(res);
      }, err => {
        console.log(err);
        this.snackbar.open('Ocorreu um erro ao publicar!', 'Dismiss', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        this.showSpinner = false;
      });
    this.publication.text = '';
  }

  getThumbnailImage(videoUrl: string){
    return this.externalService.getYoutubeTumbnail(`${videoUrl}`);
  }

  listarPostagens(userId: string) {
    this.appservice.listrarPostagens(userId)
    .subscribe(publications => {
      publications.forEach(publication => {
        publication.publicationDate = this.formatDateService.formatDate(publication.publicationDate);
        this.userPublications.push(publication);
      });
    }, err => {
      this.snackbar.open('Ocorreu um erro ao listar as publicações!', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      console.log(err);
    });
  }

  retornaDadosUsuarios(user: string) {
    this.appservice.retornarDadosUsuario(user)
      .subscribe(user => {
        if (user.birthDate) {
          user.birthDate = this.formatDateService.formatDatewithoutHour(user.birthDate);
        }
        if (user.careerDate) {
          user.careerDate = this.formatDateService.formatDatewithoutHour(user.careerDate);
        }
        this.usuario = user;
      });
  }

  deletePublication(publicationId: string) {
    const data = {
      text: 'Tem certeza que deseja deletar a postagem?',
      title: 'Deletar Postagem',
      buttonYes: 'Deletar',
      buttonNo: 'Cancelar'
    }
    this.openModalService.openDialog(data).subscribe(res=>{
      if(res){
        this.appservice.deletaPublication(publicationId)
        .subscribe(res=>{
            this.snackbar.open('Publicação deletada com sucesso!', 'Dismiss', {
              duration: 4000,
              panelClass: ['success-snackbar']
            });
            this.deleteFromPubList(publicationId);
          }, err => {
            console.log(err);
            this.snackbar.open('Ocorreu um erro ao deletar a publicação!', 'Dismiss', {
              duration: 4000,
              panelClass: ['error-snackbar']
            });
          });
        this.publication.text = '';
      }else{
        console.log('Publicação não excluida');
      }
    })
  }

  deleteFromPubList(publicationId: string){
    this.userPublications = this.userPublications.filter(function(pub, index, arr){
      return pub.publicationID != publicationId;
    });
  }

  getProfessionalTopics(professionalId: string){
    this.appservice.getProfessionalTopics(professionalId)
    .subscribe(res=>{
      res.forEach(topic =>{
        this.topics.push(topic.description);
      })
    }, err => {
      console.log(err);
      this.snackbar.open('Ocorreu um erro ao buscar os Tópicos de Interesse!', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    });
  }

  recomendar() {
    const myId = this.sessionService.getUserLogged();
    this.appservice.recommend(myId, this.usuario.professionalID)
    .subscribe(res => {
      this.snackbar.open('Recomendação feita com sucesso!', 'Dismiss', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });
      this.alreadyRecommended = true;
    }, err => {
      console.log(err);
      this.snackbar.open(`${err.error}`, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    });
  }

  statusRecomendacao() {
    const myId = this.sessionService.getUserLogged();
    this.appservice.statusRecommendation(myId, this.usuario.professionalID)
    .subscribe(status => {
      if (status === 0) {
        this.alreadyRecommended = false;
      } else {
        this.alreadyRecommended = true;
      }
    }, err => {
      console.log(err);
      this.snackbar.open(`Erro ao buscar a recomendação`, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    });
  }

  deletarRecomendacao() {
    const myId = this.sessionService.getUserLogged();
    this.appservice.deleteRecommendation(myId, this.usuario.professionalID)
    .subscribe(res => {
      this.snackbar.open(`Recomendação deletada!`, 'Dismiss', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });
      this.alreadyRecommended = false;
    }, err => {
      console.log(err);
      this.snackbar.open(`Erro ao deletar recomendação!`, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    });
  }

  getRecomendacoes() {
    this.appservice.getProfessionalsWhoRecommended(this.usuario.professionalID)
    .subscribe(res => {
      console.log(res)
      this.recommendationLength = res.length;
      console.log(this.recommendationLength)
    }, err => {
      console.log(err);
      this.snackbar.open(`Erro buscar número de recomendações!`, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    });
  }

}
