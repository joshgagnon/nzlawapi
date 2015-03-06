 <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">



    <xsl:template match="schedule.group">
      <div class="schedule-group">
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
        <xsl:apply-templates select="schedule"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.provisions">
      <div class="schedule-provisions">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
        <xsl:apply-templates select="prov|part|schedule.group"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.misc">
      <div class="schedule-misc">
        <xsl:apply-templates select="head1|para|prov"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.forms">
      <div class="schedule-forms">
        <xsl:apply-templates select="form"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.amendments">
      <div class="schedule.amendments">
        <xsl:apply-templates />
      </div>
    </xsl:template>

    <xsl:template match="schedule.amendments.group2">
      <div class="schedule-amendments-group2">
        <xsl:attribute name="id">
              <xsl:value-of select="@id"/>
          </xsl:attribute>
        <h5 class="schedule-amendments-group2"><xsl:value-of select="heading"/></h5>
        <xsl:apply-templates select="para"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule">
        <div class="schedule">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:call-template name="current"/>
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:attribute name="data-location"><xsl:if test="ancestor::schedule">&#160;</xsl:if>sch <xsl:value-of select="label"/></xsl:attribute>
            <table class="empowering-prov-layout" summary="This table lays out an empowering provision with it's subject. ">
                <tbody><tr>
                    <td class="header">
                        <h2 class="schedule">
                            <span class="label">
                                <span class="hit">Schedule</span>
                                <xsl:if test="./label/text()!='Schedule'">&#160;<xsl:value-of select="label"/></xsl:if>
                            </span><br/>
                            <xsl:value-of select="heading"/>
                        </h2>
                    </td>
                    <td class="empowering-prov">
                    </td>
                    </tr>
                </tbody>
            </table>
            <xsl:apply-templates select="schedule.provisions|schedule.misc|schedule.forms|schedule.amendments|notes"/>
        </div>
    </xsl:template>

  </xsl:stylesheet>