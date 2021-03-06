package feed

import contentapi.ContentApiClient
import common._
import model.RelatedContentItem
import play.api.libs.json.{JsArray, JsValue}
import scala.concurrent.Future
import services.OphanApi

class MostViewedGalleryAgent(contentApiClient: ContentApiClient, ophanApi: OphanApi) extends Logging with ExecutionContexts {

  private val agent = AkkaAgent[Seq[RelatedContentItem]](Nil)

  def mostViewedGalleries(): Seq[RelatedContentItem] = agent()

  def refresh() = {
    log.info("Refreshing most viewed galleries.")

    val ophanResponse = ophanApi.getMostViewedGalleries(hours = 3, count = 12)

    ophanResponse.map { result =>

      val mostViewed: Iterable[Future[Option[RelatedContentItem]]] = for {
        item: JsValue <- result.asOpt[JsArray].map(_.value).getOrElse(Nil)
        url <- (item \ "url").asOpt[String]
        count <- (item \ "count").asOpt[Int]
      } yield {
        contentApiClient.getResponse(contentApiClient.item(urlToContentPath(url), Edition.defaultEdition)).map(_.content.map { item =>
          RelatedContentItem(item)
        })
      }

      Future.sequence(mostViewed).map { contentSeq =>
        val galleries = contentSeq.toSeq.collect {
          case gallery if gallery.exists(_.content.tags.isGallery) => gallery
        }
        agent alter galleries.flatten
      }
    }
  }
}
